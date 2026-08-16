from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import AutoTokenizer, AutoModel
import torch
import numpy as np
import json
import os

app = Flask(__name__)
CORS(app)

# ─── CONFIG ───
SKILLS_FILE = os.path.join(os.path.dirname(__file__), 'skills.jsonl')
RECALL_TOP_N = 6
RERANK_TOP_K = 3

print("=" * 60)
print("R3-Skill Server Starting...")
print("Loading Tencent R3-Embedding (bi-encoder) ...")
print("  Model: tencent/R3-embedding-0.6b  (~600MB download)")
print("=" * 60)

tokenizer_emb = AutoTokenizer.from_pretrained('tencent/R3-embedding-0.6b')
model_emb = AutoModel.from_pretrained('tencent/R3-embedding-0.6b')
model_emb.eval()

print("Loading Tencent R3-Reranker (cross-encoder) ...")
print("  Model: tencent/R3-rerank-0.6b  (~600MB download)")
print("=" * 60)

tokenizer_rerank = AutoTokenizer.from_pretrained('tencent/R3-rerank-0.6b')
model_rerank = AutoModel.from_pretrained('tencent/R3-rerank-0.6b')
model_rerank.eval()

print("Models loaded. Server ready.")
print("=" * 60)

# ─── HELPERS ───
def mean_pooling(token_embeddings, attention_mask):
    input_mask_expanded = attention_mask.unsqueeze(-1).float()
    return (token_embeddings * input_mask_expanded).sum(dim=1) / input_mask_expanded.sum(dim=1).clamp(min=1e-9)

def get_embedding(text):
    inputs = tokenizer_emb(text, return_tensors="pt", padding=True, truncation=True, max_length=512)
    with torch.no_grad():
        outputs = model_emb(**inputs)
    return mean_pooling(outputs.last_hidden_state, inputs['attention_mask']).numpy().flatten()

def cosine_similarity(a, b):
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9))

def rerank_score(query, skill_text):
    # Cross-encoder: concatenate query + skill with [SEP] token
    inputs = tokenizer_rerank(query, skill_text, return_tensors="pt", padding=True, truncation=True, max_length=512)
    with torch.no_grad():
        outputs = model_rerank(**inputs)
    # Use CLS token representation as relevance score proxy
    cls = outputs.last_hidden_state[:, 0, :]
    score = torch.norm(cls, dim=1).item()
    return score

def load_skills():
    skills = []
    with open(SKILLS_FILE, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line:
                skills.append(json.loads(line))
    return skills

SKILLS = load_skills()
print(f"Loaded {len(SKILLS)} skills from {SKILLS_FILE}")

# ─── ENDPOINTS ───
@app.route('/api/r3/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'OK',
        'message': 'Tencent R3-Skill server running',
        'skills_loaded': len(SKILLS)
    })

@app.route('/api/r3/route', methods=['POST'])
def route_skill():
    data = request.get_json()
    query = data.get('query', '').strip()
    recall_n = data.get('recall_n', RECALL_TOP_N)
    top_k = data.get('top_k', RERANK_TOP_K)

    if not query:
        return jsonify({'error': 'Missing query'}), 400

    # ─── STAGE 1: RECALL (Bi-encoder embedding similarity) ───
    query_emb = get_embedding(query)

    candidates = []
    for skill in SKILLS:
        skill_emb = get_embedding(skill['description'])
        sim = cosine_similarity(query_emb, skill_emb)
        candidates.append({
            'name': skill['name'],
            'description': skill['description'],
            'recall_score': sim
        })

    # Top-N by recall
    candidates = sorted(candidates, key=lambda x: x['recall_score'], reverse=True)[:recall_n]

    # ─── STAGE 2: RERANK (Cross-encoder) ───
    reranked = []
    for skill in candidates:
        score = rerank_score(query, skill['description'])
        reranked.append({
            'name': skill['name'],
            'description': skill['description'],
            'recall_score': skill['recall_score'],
            'rerank_score': score
        })

    # Sort by rerank score
    reranked = sorted(reranked, key=lambda x: x['rerank_score'], reverse=True)

    best = reranked[0] if reranked else None

    return jsonify({
        'query': query,
        'best_skill': {
            'name': best['name'],
            'description': best['description'],
            'confidence': round(best['rerank_score'], 4)
        } if best else None,
        'top_matches': [
            {
                'name': s['name'],
                'recall_score': round(s['recall_score'], 4),
                'rerank_score': round(s['rerank_score'], 4)
            }
            for s in reranked[:top_k]
        ]
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5051, debug=False)