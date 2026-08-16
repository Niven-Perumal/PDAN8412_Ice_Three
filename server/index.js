import express from 'express'
import cors from 'cors'

const app = express()

app.use(cors())
app.use(express.json({ limit: '5mb' }))

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Local AI server is running'
  })
})

// ─── ORIGINAL ASSISTANT ───
app.post('/api/assistant', async (req, res) => {
  try {
    const { question, dashboard } = req.body

    if (!question || !dashboard) {
      return res.status(400).json({
        error: 'Missing question or dashboard data'
      })
    }

    const ollamaController = new AbortController()
    const ollamaTimeout = setTimeout(() => ollamaController.abort(), 300000)

    const ollamaResponse = await fetch('http://127.0.0.1:11434/api/chat', {
      signal: ollamaController.signal,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'qwen2:0.5b',
        stream: false,
        options: {
          num_predict: 512
        },
        messages: [
          {
            role: 'system',
            content: `
You are an intelligence dashboard assistant.

You answer only from the dashboard data provided.
Do not invent information.
If something is not visible in the dashboard data, say that it is not currently shown.

Keep answers clear, useful, and analyst-style.

When asked for a summary, include:
- Global risk level
- Top threat
- Correlated threats
- Major cyber activity
- Major disaster activity
- Air and maritime activity
`
          },
          {
            role: 'user',
            content: `
Question:
${question}

Dashboard Data:
${JSON.stringify(dashboard, null, 2)}
`
          }
        ]
      })
    })

    clearTimeout(ollamaTimeout)

    const data = await ollamaResponse.json()

    res.json({
      answer: data.message?.content || 'No response from local AI.'
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: 'Local AI assistant failed to respond'
    })
  }
})




// ─── MODEL A: DETERMINISTIC ───
// Always produces the same output for the same input.
// temperature = 0, top_k = 1 (greedy decoding), fixed seed.
app.post('/api/assistant/deterministic', async (req, res) => {
  try {
    const { question, dashboard } = req.body

    if (!question || !dashboard) {
      return res.status(400).json({
        error: 'Missing question or dashboard data'
      })
    }

    const ollamaController = new AbortController()
    const ollamaTimeout = setTimeout(() => ollamaController.abort(), 300000)

    const ollamaResponse = await fetch('http://127.0.0.1:11434/api/chat', {
      signal: ollamaController.signal,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'qwen2:0.5b',
        stream: false,
        options: {
          temperature: 0,
          top_k: 1,
          seed: 42,
          num_predict: 512
        },
        messages: [
          {
            role: 'system',
            content: `
You are a deterministic intelligence analyst.
You always produce the same structured report for the same data.
Be concise, factual, and consistent.
`
          },
          {
            role: 'user',
            content: `
Question:
${question}

Dashboard Data:
${JSON.stringify(dashboard, null, 2)}
`
          }
        ]
      })
    })

    clearTimeout(ollamaTimeout)

    const data = await ollamaResponse.json()

    res.json({
      answer: data.message?.content || 'No response from deterministic model.'
    })
  } catch (error) {
    console.error('Deterministic model error:', error)
    res.status(500).json({
      error: 'Deterministic model failed to respond'
    })
  }
})




// ─── MODEL B: PROBABILISTIC ───
// Uses sampling (temperature > 0) so repeated runs can differ.
app.post('/api/assistant/probabilistic', async (req, res) => {
  try {
    const { question, dashboard } = req.body

    if (!question || !dashboard) {
      return res.status(400).json({
        error: 'Missing question or dashboard data'
      })
    }

    const ollamaController = new AbortController()
    const ollamaTimeout = setTimeout(() => ollamaController.abort(), 300000)

    const ollamaResponse = await fetch('http://127.0.0.1:11434/api/chat', {
      signal: ollamaController.signal,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'qwen2:0.5b',
        stream: false,
        options: {
          temperature: 0.8,
          top_p: 0.9,
          top_k: 40,
          num_predict: 512
        },
        messages: [
          {
            role: 'system',
            content: `
You are a probabilistic intelligence analyst.
You may vary your wording, emphasis, or interpretation between runs.
Provide insightful, analyst-style summaries that can differ in phrasing.
`
          },
          {
            role: 'user',
            content: `
Question:
${question}

Dashboard Data:
${JSON.stringify(dashboard, null, 2)}
`
          }
        ]
      })
    })

    clearTimeout(ollamaTimeout)

    const data = await ollamaResponse.json()

    res.json({
      answer: data.message?.content || 'No response from probabilistic model.'
    })
  } catch (error) {
    console.error('Probabilistic model error:', error)
    res.status(500).json({
      error: 'Probabilistic model failed to respond'
    })
  }
})

app.listen(5050, () => {
  console.log('Local AI assistant running on http://localhost:5050')
  console.log('Endpoints: /api/assistant, /api/assistant/deterministic, /api/assistant/probabilistic')
})




// ─── MODEL C: TENCENT R3-SKILL ROUTER ───
// Forwards to the Python R3-Skill microservice on port 5051
app.post('/api/r3/route', async (req, res) => {
  try {
    const { query } = req.body

    if (!query || !query.trim()) {
      return res.status(400).json({
        error: 'Missing query for R3-Skill routing'
      })
    }

    const r3Response = await fetch('http://127.0.0.1:5051/api/r3/route', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: query.trim(),
        recall_n: 6,
        top_k: 3
      })
    })

    if (!r3Response.ok) {
      const errText = await r3Response.text()
      console.error('R3-Skill error:', errText)
      return res.status(502).json({
        error: 'R3-Skill server returned an error',
        details: errText
      })
    }

    const data = await r3Response.json()
    res.json(data)
  } catch (error) {
    console.error('R3-Skill connection error:', error)
    res.status(500).json({
      error: 'Could not connect to R3-Skill server. Make sure python server/r3_server.py is running.'
    })
  }
})

app.listen(5050, () => {
  console.log('Local AI assistant running on http://localhost:5050')
  console.log('Endpoints: /api/assistant, /api/assistant/deterministic, /api/assistant/probabilistic, /api/r3/route')
})