import { useEffect, useRef, useState } from 'react'
import Globe from 'react-globe.gl'
import * as topojson from 'topojson-client'
import * as THREE from 'three'
import './App.css'
import * as satellite from 'satellite.js'
import ReactMarkdown from 'react-markdown'

  const CLOUDFLARE_RADAR_TOKEN = ''
  const BGP_API_TOKEN = ''

function App() {
  const globeRef = useRef()
  const containerRef = useRef()
  const [countries, setCountries] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [globeSize, setGlobeSize] = useState({ width: 800, height: 600 })
  const [iss, setIss] = useState([])
  const [earthquakes, setEarthquakes] = useState([])
//  const [issTrail, setIssTrail] = useState([])
  const [spaceWeather, setSpaceWeather] = useState(null)
  const [satellites, setSatellites] = useState([])
  const [weatherAlerts, setWeatherAlerts] = useState([])
  const [globalAlerts, setGlobalAlerts] = useState([])
  const [volcanoes, setVolcanoes] = useState([])
  const [cves, setCves] = useState([])
  const [kevAlerts, setKevAlerts] = useState([])
  const [internetOutages, setInternetOutages] = useState([])
  const [bgpAlerts, setBgpAlerts] = useState([])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [selectedFilters, setSelectedFilters] = useState([
  'All',
  'Earthquake',
  'Volcano',
  'Weather Alert',
  'Space Object',
  'Internet Outage',
  'CVE',
  'Cyber Alert',
  'BGP Hijack',
  'Ransomware',
  'Data Breach',
  'Threat Intel',
  'Aircraft',
  'Maritime'
  
])
  const [issCrew, setIssCrew] = useState({ number: 0, people: [] })
  const issLiveData = useRef({ speed: 0, altitude: 0 })
  const [ransomwareAlerts, setRansomwareAlerts] = useState([])
  const [breachAlerts, setBreachAlerts] = useState([])
  const [threatIntelAlerts, setThreatIntelAlerts] = useState([])
  const [timelineRange, setTimelineRange] = useState('24h')
  const [selectedCorrelation, setSelectedCorrelation] = useState(null)
  const [newsFeed, setNewsFeed] = useState([])
  const [aircraft, setAircraft] = useState([])
  const [vessels, setVessels] = useState([])
  const [showHeatmap, setShowHeatmap] = useState(true)
  const [assistantQuestion, setAssistantQuestion] = useState('')
  const [assistantAnswer, setAssistantAnswer] = useState('')
  const [assistantLoading, setAssistantLoading] = useState(false)
  const [assistantModel, setAssistantModel] = useState('original')
  const [r3Query, setR3Query] = useState('')
  const [r3Result, setR3Result] = useState(null)
  const [r3Loading, setR3Loading] = useState(false)



const filterOptions = [
  'Earthquake',
  'Volcano',
  'Weather Alert',
  'Space Object',
  'Internet Outage',
  'CVE',
  'Cyber Alert',
  'BGP Hijack',
  'Ransomware',
  'Data Breach',
  'Threat Intel',
  'Aircraft',
  'Maritime',
]

const toggleFilter = (filter) => {
  if (filter === 'All') {
    setSelectedFilters(
      selectedFilters.includes('All') ? [] : ['All', ...filterOptions]
    )
    return
  }

  let updatedFilters = selectedFilters.includes(filter)
    ? selectedFilters.filter(item => item !== filter && item !== 'All')
    : [...selectedFilters.filter(item => item !== 'All'), filter]

  if (updatedFilters.length === filterOptions.length) {
    updatedFilters = ['All', ...filterOptions]
  }

  setSelectedFilters(updatedFilters)
}

  const events = [
    {
      lat: 35.6762,
      lng: 139.6503,
      size: 0.5,
      color: '#ff3b3b',
      title: 'Tokyo Event',
      type: 'Earthquake',
      location: 'Tokyo, Japan',
      details: 'Magnitude 5.8 earthquake detected near Tokyo.',
      time: '12 minutes ago'
    },
    {
      lat: 51.5072,
      lng: -0.1276,
      size: 0.45,
      color: '#ffaa00',
      title: 'London Outage',
      type: 'Internet Outage',
      location: 'London, UK',
      details: 'Possible service disruption affecting multiple networks.',
      time: '28 minutes ago'
    },
    {
      lat: -29.8587,
      lng: 31.0218,
      size: 0.45,
      color: '#7CFF6B',
      title: 'Durban Alert',
      type: 'Local Alert',
      location: 'Durban, South Africa',
      details: 'Sample event marker for your dashboard.',
      time: 'Live'
    }
  ]

  useEffect(() => {
    const fetchSpaceWeather = async () => {
      try {
        const response = await fetch(
          'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json'
        )
        const data = await response.json()
        const latest = data[data.length - 1]
        setSpaceWeather({
          time: latest[0],
          kpIndex: latest[1],
          status:
            Number(latest[1]) >= 7
              ? 'Strong geomagnetic storm'
              : Number(latest[1]) >= 5
              ? 'Geomagnetic storm'
              : Number(latest[1]) >= 4
              ? 'Active'
              : 'Quiet'
        })
      } catch (error) {
        console.log('Space weather error:', error)
      }
    }

    fetchSpaceWeather()
    const interval = setInterval(fetchSpaceWeather, 300000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    let satrec = null
    let tleInterval = null
    let updateInterval = null

const fetchTLE = async () => {
  try {
    const res = await fetch('https://api.wheretheiss.at/v1/satellites/25544/tles?format=text')
    const text = await res.text()
    if (text.includes('25544')) {
      const lines = text.trim().split('\n')
      if (lines.length >= 3) {
        const newSatrec = satellite.twoline2satrec(lines[1].trim(), lines[2].trim())
        if (newSatrec && !newSatrec.error) {
          satrec = newSatrec
          localStorage.setItem('iss_tle', text)
          localStorage.setItem('iss_tle_time', Date.now())
          console.log('TLE loaded from wheretheiss.at')
          return
        }
      }
    }
  } catch (e) {
    console.log('TLE fetch failed, trying cache')
  }

  const cachedTLE = localStorage.getItem('iss_tle')
  if (cachedTLE) {
    const lines = cachedTLE.trim().split('\n')
    const newSatrec = satellite.twoline2satrec(lines[1].trim(), lines[2].trim())
    if (newSatrec && !newSatrec.error) {
      satrec = newSatrec
      console.log('TLE loaded from cache')
    }
  }
}

const updateISS = () => {
  if (!satrec) return

  const now = new Date()
  const pv = satellite.propagate(satrec, now)
  if (!pv.position) return

  const gmst = satellite.gstime(now)
  const geo = satellite.eciToGeodetic(pv.position, gmst)
  const lat = satellite.degreesLat(geo.latitude)
  const lng = satellite.degreesLong(geo.longitude)

  const orbitDots = []

  for (let i = 0; i <= 180; i++) {
    const futureDate = new Date(now.getTime() + i * 30 * 1000)
    const fpv = satellite.propagate(satrec, futureDate)
    if (!fpv.position) continue
    const fgmst = satellite.gstime(futureDate)
    const fgeo = satellite.eciToGeodetic(fpv.position, fgmst)
    const orbitLat = satellite.degreesLat(fgeo.latitude)
const orbitLng = satellite.degreesLong(fgeo.longitude)

if (Number.isFinite(orbitLat) && Number.isFinite(orbitLng)) {
  orbitDots.push({
    lat: orbitLat,
    lng: orbitLng,
    size: 0.15,
    color: '#00e5ff',
    title: 'ISS Orbit Path',
    type: 'Space Object',
    isOrbitDot: true
  })
}
  }

  setIss([{
    lat,
    lng,
    size: 0.8,
    color: '#00ffff',
    title: 'International Space Station',
    type: 'Space Object',
    location: `Low Earth Orbit (${issLiveData.current.altitude.toFixed(0)} km)`,

    details: `Ground Point:
  ${lat.toFixed(2)}° ${lat >= 0 ? 'North' : 'South'} ${Math.abs(lng).toFixed(2)}° ${lng >= 0 ? 'East' : 'West'}

  Orbital Speed:
  ${issLiveData.current.speed.toFixed(0)} km/h
  ${(issLiveData.current.speed / 3.6).toFixed(0)} m/s

  Altitude:
  ${issLiveData.current.altitude.toFixed(1)} km`,

    time: 'Live',
    isOrbitDot: false
  }, ...orbitDots])

}

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchTLE().then(() => updateISS())
      }
    }

    fetchTLE().then(() => {
      updateISS()
      updateInterval = setInterval(updateISS, 3000)
      tleInterval = setInterval(fetchTLE, 6 * 60 * 60 * 1000)
    })

    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(tleInterval)
      clearInterval(updateInterval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  useEffect(() => {
    const fetchEarthquakes = async () => {
      try {
        const response = await fetch(
          'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson'
        )
        const data = await response.json()
        const earthquakeEvents = data.features.map((quake) => {
          const [lng, lat, depth] = quake.geometry.coordinates
          const magnitude = quake.properties.mag
          return {
            lat,
            lng,
            size: Math.max(0.25, magnitude / 8),
            color: magnitude >= 5 ? '#ff3b3b' : '#ffaa00',
            title: `M${magnitude} Earthquake`,
            type: 'Earthquake',
            location: quake.properties.place,
            details: `Depth: ${Math.round(depth)} km`,
            time: new Date(quake.properties.time).toLocaleString()
          }
        })
        setEarthquakes(earthquakeEvents)
      } catch (error) {
        console.log('Earthquake data error:', error)
      }
    }

    fetchEarthquakes()
    const interval = setInterval(fetchEarthquakes, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
  const fetchGlobalAlerts = async () => {
    try {
      const response = await fetch(
        'https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?'
      )

      const data = await response.json()

      const alerts = data.features
        .filter((alert) => alert.geometry)
        .map((alert) => ({
          lat: alert.geometry.coordinates[1],
          lng: alert.geometry.coordinates[0],
          size: 0.55,
          color: '#00bfff',
          title: alert.properties.name || 'Global Alert',
          type: 'Weather Alert',
          location: alert.properties.country || 'Global',
          details: alert.properties.description || 'GDACS global disaster alert',
          time: alert.properties.fromdate || 'Live'
        }))

      setGlobalAlerts(alerts)
    } catch (error) {
      console.log('Global alert error:', error)
    }
  }

  fetchGlobalAlerts()

  const interval = setInterval(fetchGlobalAlerts, 300000)

  return () => clearInterval(interval)
}, [])

useEffect(() => {
  const fetchVolcanoes = async () => {
    try {
      const response = await fetch(
        'https://eonet.gsfc.nasa.gov/api/v3/events?category=volcanoes&status=open'
      )

      const data = await response.json()

      const volcanoEvents = data.events.map((event) => {
        const geometry = event.geometry[event.geometry.length - 1]

        return {
          lat: geometry.coordinates[1],
          lng: geometry.coordinates[0],
          size: 0.65,
          color: '#ff4d00',
          title: event.title,
          type: 'Volcano',
          location: event.sources?.[0]?.id || 'NASA EONET',
          details: `Active volcano event tracked by NASA EONET.`,
          time: geometry.date || 'Live'
        }
      })

      setVolcanoes(volcanoEvents)
    } catch (error) {
      console.log('Volcano data error:', error)
    }
  }

  fetchVolcanoes()

  const interval = setInterval(fetchVolcanoes, 300000)

  return () => clearInterval(interval)
}, [])

useEffect(() => {
  const fetchCVEs = async () => {
    try {
      const now = new Date()
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      const pubStartDate = yesterday.toISOString()
      const pubEndDate = now.toISOString()

      const response = await fetch(
        `https://services.nvd.nist.gov/rest/json/cves/2.0?pubStartDate=${pubStartDate}&pubEndDate=${pubEndDate}&resultsPerPage=20`
      )

      const data = await response.json()

      const cveEvents = data.vulnerabilities.map((item) => {
        const cve = item.cve
        const metrics = cve.metrics?.cvssMetricV31?.[0] || cve.metrics?.cvssMetricV30?.[0]
        const score = metrics?.cvssData?.baseScore || 0
        const severity = metrics?.cvssData?.baseSeverity || 'UNKNOWN'

        return {
          lat: 37.7749,
          lng: -122.4194,
          size: score >= 9 ? 0.7 : score >= 7 ? 0.55 : 0.4,
          color: score >= 9 ? '#ff0033' : score >= 7 ? '#ff8800' : '#ffee00',
          title: cve.id,
          type: 'CVE',
          location: 'Cyber Intelligence',
          details:
  `Severity: ${severity}
CVSS Score: ${score}

${cve.descriptions?.[0]?.value || 'No description available'}`,
          time: cve.published
        }
      })

      setCves(cveEvents)
    } catch (error) {
      console.log('CVE data error:', error)
    }
  }

  fetchCVEs()

  const interval = setInterval(fetchCVEs, 300000)

  return () => clearInterval(interval)
}, [])

useEffect(() => {
  const fetchKEV = async () => {
    try {
      const response = await fetch(
        'https://corsproxy.io/?https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json'

      )

      const data = await response.json()

      const alerts = data.vulnerabilities
        .slice(0, 25)
        .map((vuln, index) => ({
          lat: 38.8977 + (Math.random() - 0.5) * 8,
          lng: -77.0365 + (Math.random() - 0.5) * 8,
          size: 0.9,
          color: '#ff0000',
          title: vuln.cveID,
          type: 'Cyber Alert',
          location: vuln.vendorProject,
          details:
            `${vuln.product}

${vuln.shortDescription}

Known Exploited Vulnerability`,
          time: vuln.dateAdded
        }))

      setKevAlerts(alerts)
    } catch (error) {
      console.log('KEV error:', error)
    }
  }

  fetchKEV()

  const interval = setInterval(fetchKEV, 3600000)

  return () => clearInterval(interval)
}, [])

useEffect(() => {
  const fetchInternetOutages = async () => {
    try {
      if (!CLOUDFLARE_RADAR_TOKEN) {
        console.log('Cloudflare Radar token missing')
        setInternetOutages([])
        return
      }

      const response = await fetch(
        'https://api.cloudflare.com/client/v4/radar/annotations/outages',
        {
          headers: {
            Authorization: `Bearer ${CLOUDFLARE_RADAR_TOKEN}`
          }
        }
      )

      const data = await response.json()

      const outages = data.result.annotations.slice(0, 25).map((outage) => ({
        lat: 20 + (Math.random() - 0.5) * 120,
        lng: 0 + (Math.random() - 0.5) * 300,
        size: 0.7,
        color: '#b000ff',
        title: outage.description || 'Internet Outage',
        type: 'Internet Outage',
        location: outage.scope || 'Global',
        details: `Cause: ${outage.cause || 'Unknown'}

Status: ${outage.status || 'Unknown'}

Start: ${outage.startDate || 'Unknown'}

End: ${outage.endDate || 'Ongoing'}

Source: Cloudflare Radar`,
        time: outage.startDate || 'Live'
      }))

      setInternetOutages(outages)
    } catch (error) {
      console.log('Internet outage feed error:', error)
    }
  }

  fetchInternetOutages()

  const interval = setInterval(fetchInternetOutages, 300000)

  return () => clearInterval(interval)
}, [])

useEffect(() => {
  const fetchBGPAlerts = async () => {
    try {
      if (!BGP_API_TOKEN) {
        console.log('BGP API token missing')
        setBgpAlerts([])
        return
      }

      const response = await fetch(
        'https://api.bgpview.io/events',
        {
          headers: {
            Authorization: `Bearer ${BGP_API_TOKEN}`
          }
        }
      )

      const data = await response.json()

      const alerts = data.data.slice(0, 25).map((event) => ({
        lat: 20 + (Math.random() - 0.5) * 120,
        lng: 0 + (Math.random() - 0.5) * 300,
        size: 0.7,
        color: '#ff00ff',
        title: event.name || 'BGP Routing Event',
        type: 'BGP Hijack',
        location: event.country || 'Global Routing System',
        details: `Event Type: ${event.type || 'Unknown'}

ASN: ${event.asn || 'Unknown'}

Description: ${event.description || 'No description available'}

Source: BGPView`,
        time: event.time || 'Live'
      }))

      setBgpAlerts(alerts)
    } catch (error) {
      console.log('BGP feed error:', error)
    }
  }

  fetchBGPAlerts()

  const interval = setInterval(fetchBGPAlerts, 300000)

  return () => clearInterval(interval)
}, [])

  useEffect(() => {
  const fetchWeatherAlerts = async () => {
    try {
      const response = await fetch(
        'https://api.weather.gov/alerts/active'
      )

      const data = await response.json()

      const alerts = data.features.slice(0, 50).map(alert => ({
        lat: alert.geometry?.coordinates?.[0]?.[0]?.[1] || 0,
        lng: alert.geometry?.coordinates?.[0]?.[0]?.[0] || 0,
        size: 0.4,
        color: '#00bfff',
        title: alert.properties.event,
        type: 'Weather Alert',
        location: alert.properties.areaDesc,
        details: alert.properties.headline,
        time: 'Live'
      }))

      setWeatherAlerts(alerts)
    } catch (error) {
      console.log('Weather alert error:', error)
    }
  }

  fetchWeatherAlerts()

  const interval = setInterval(fetchWeatherAlerts, 300000)

  return () => clearInterval(interval)
}, [])

  useEffect(() => {
    const createSatellites = () => {
      return Array.from({ length: 120 }, (_, i) => ({
        id: i,
        lat: Math.sin(i * 0.45) * 55,
        lng: (i * 18) % 360,
        altitude: 0.22,
        label: `Starlink-${i + 1}`,
        speed: 0.03 + Math.random() * 0.05
      }))
    }
    setSatellites(createSatellites())
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setSatellites(prevSatellites =>
        prevSatellites.map(sat => ({
          ...sat,
          lng: (sat.lng + sat.speed) % 360,
          lat: Math.sin((sat.lng + sat.speed) * 0.04 + sat.id) * 55
        }))
      )
    }, 100)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    fetch('https://unpkg.com/world-atlas/countries-110m.json')
      .then(res => res.json())
      .then(worldData => {
        const countryFeatures = topojson.feature(
          worldData,
          worldData.objects.countries
        ).features
        setCountries(countryFeatures)
      })
  }, [])

  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return
      setGlobeSize({
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight
      })
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  useEffect(() => {
    if (!globeRef.current) return
    const controls = globeRef.current.controls()
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.6
    controls.enableZoom = true
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    globeRef.current.pointOfView({ lat: 0, lng: 20, altitude: 2.2 })

    let rotationTimeout
    const pauseRotation = () => {
      controls.autoRotate = false
      clearTimeout(rotationTimeout)
      rotationTimeout = setTimeout(() => {
        controls.autoRotate = true
      }, 1000)
    }

    const canvas = globeRef.current.renderer().domElement
    canvas.addEventListener('pointerdown', pauseRotation)
    canvas.addEventListener('wheel', pauseRotation)
    return () => {
      canvas.removeEventListener('pointerdown', pauseRotation)
      canvas.removeEventListener('wheel', pauseRotation)
      clearTimeout(rotationTimeout)
    }
  }, [])

  useEffect(() => {
  const fetchCrew = async () => {
    try {
      const res = await fetch('https://corsproxy.io/?http://api.open-notify.org/astros.json')
      const data = await res.json()
      const issOnly = data.people.filter(p => p.craft === 'ISS')
      setIssCrew({ number: issOnly.length, people: issOnly })
    } catch (e) {
      console.log('Crew fetch error:', e)
    }
  }
  fetchCrew()
  const interval = setInterval(fetchCrew, 3600000)
  return () => clearInterval(interval)
}, [])

useEffect(() => {
  const fetchLiveStats = async () => {
    try {
      const res = await fetch('https://api.wheretheiss.at/v1/satellites/25544')
      const data = await res.json()
      issLiveData.current = {
        speed: data.velocity,
        altitude: data.altitude
      }
    } catch (e) {
      console.log('Live stats error:', e)
    }
  }
  fetchLiveStats()
  const interval = setInterval(fetchLiveStats, 5000)
  return () => clearInterval(interval)
}, [])

useEffect(() => {
  const fetchRansomwareAlerts = async () => {
    try {
      const response = await fetch(
        'https://api.ransomware.live/v2/recentvictims'
      )

      const data = await response.json()

      const alerts = data.slice(0, 25).map((victim, index) => ({
        lat: 20 + (Math.random() - 0.5) * 120,
        lng: 0 + (Math.random() - 0.5) * 300,
        size: 0.8,
        color: '#ff0055',
        title: victim.victim || 'Ransomware Victim',
        type: 'Ransomware',
        location: victim.country || 'Unknown',
        details: `Group: ${victim.group || 'Unknown'}

Sector: ${victim.activity || 'Unknown'}

Discovered: ${victim.discovered || victim.published || 'Unknown'}

Source: Ransomware.live`,
        time: victim.discovered || victim.published || 'Live'
      }))

      setRansomwareAlerts(alerts)
    } catch (error) {
      console.log('Ransomware feed error:', error)
    }
  }

  fetchRansomwareAlerts()

  const interval = setInterval(fetchRansomwareAlerts, 300000)

  return () => clearInterval(interval)
}, [])

useEffect(() => {
  const fetchBreaches = async () => {
    try {
      const response = await fetch(
        'https://haveibeenpwned.com/api/v3/breaches'
      )

      const data = await response.json()

      const breaches = data.slice(0, 25).map((breach) => ({
        lat: 37.7749 + (Math.random() - 0.5) * 40,
        lng: -95.7129 + (Math.random() - 0.5) * 100,
        size: 0.75,
        color: '#ff6600',
        title: breach.Name,
        type: 'Data Breach',
        location: breach.Domain,
        details: `${breach.Description}

Records: ${breach.PwnCount.toLocaleString()}

Data Classes:
${breach.DataClasses.slice(0, 5).join(', ')}`,
        time: breach.BreachDate
      }))

      setBreachAlerts(breaches)
    } catch (error) {
      console.log('Breach feed error:', error)
    }
  }

  fetchBreaches()
}, [])

useEffect(() => {
  const fetchThreatIntel = async () => {
    try {
      const response = await fetch(
        'https://www.cisa.gov/sites/default/files/feeds/cybersecurity-advisories.json'
      )

      const data = await response.json()

      const alerts = data.items.slice(0, 25).map((item) => ({
        lat: 38.8977 + (Math.random() - 0.5) * 20,
        lng: -77.0365 + (Math.random() - 0.5) * 20,
        size: 0.75,
        color: '#00ffaa',
        title: item.title,
        type: 'Threat Intel',
        location: 'CISA Advisory',
        details: item.description || item.title,
        time: item.pubDate || 'Live'
      }))

      setThreatIntelAlerts(alerts)
    } catch (error) {
      console.log('Threat Intel feed error:', error)
    }
  }

  fetchThreatIntel()

  const interval = setInterval(fetchThreatIntel, 300000)

  return () => clearInterval(interval)
}, [])

useEffect(() => {
  const fetchBreachAlerts = async () => {
    try {
      const response = await fetch(
        'https://haveibeenpwned.com/api/v3/breaches'
      )

      const data = await response.json()

      const breaches = data.slice(0, 25).map((breach) => ({
        lat: 37.7749 + (Math.random() - 0.5) * 60,
        lng: -95.7129 + (Math.random() - 0.5) * 120,
        size: 0.75,
        color: '#ff6600',
        title: breach.Name || 'Data Breach',
        type: 'Data Breach',
        location: breach.Domain || 'Unknown',
        details: `Breach Date: ${breach.BreachDate || 'Unknown'}

Records Exposed: ${breach.PwnCount?.toLocaleString() || 'Unknown'}

Data Exposed:
${breach.DataClasses?.slice(0, 8).join(', ') || 'Unknown'}

Verified: ${breach.IsVerified ? 'Yes' : 'No'}

Source: Have I Been Pwned`,
        time: breach.BreachDate || 'Live'
      }))

      setBreachAlerts(breaches)
    } catch (error) {
      console.log('Data breach feed error:', error)
    }
  }

  fetchBreachAlerts()

  const interval = setInterval(fetchBreachAlerts, 3600000)

  return () => clearInterval(interval)
}, [])

useEffect(() => {
  const fetchAircraft = async () => {
    try {
      const response = await fetch('https://opensky-network.org/api/states/all')
      const data = await response.json()

      const aircraftEvents = data.states
        .filter(plane =>
          plane[5] !== null &&
          plane[6] !== null &&
          plane[7] !== null
        )
        .slice(0, 80)
        .map((plane) => ({
          lat: plane[6],
          lng: plane[5],
          altitude: 0.12,
          size: 0.35,
          color: '#ffffff',
          title: plane[1]?.trim() || 'Unknown Aircraft',
          type: 'Aircraft',
          location: plane[2] || 'Unknown Origin',
          details: `Callsign: ${plane[1]?.trim() || 'Unknown'}

Origin Country: ${plane[2] || 'Unknown'}

Altitude: ${Math.round(plane[7])} m

Velocity: ${plane[9] ? Math.round(plane[9] * 3.6) : 'Unknown'} km/h

Heading: ${plane[10] ? Math.round(plane[10]) : 'Unknown'}°`,
          time: 'Live'
        }))

      setAircraft(aircraftEvents)
    } catch (error) {
      console.log('Aircraft feed error:', error)
    }
  }

  fetchAircraft()

  const interval = setInterval(fetchAircraft, 60000)

  return () => clearInterval(interval)
}, [])

useEffect(() => {
  const createVessels = () => {
    return [
      {
        lat: -29.87,
        lng: 31.05,
        title: 'Durban Cargo Vessel',
        type: 'Maritime',
        location: 'Durban Port',
        details: 'Simulated cargo vessel operating near Durban harbour.',
        time: 'Live',
        size: 0.45,
        color: '#00ffcc',
        speed: 0.015
      },
      {
        lat: -33.91,
        lng: 18.42,
        title: 'Cape Town Container Ship',
        type: 'Maritime',
        location: 'Cape Town Port',
        details: 'Simulated container vessel near Cape Town.',
        time: 'Live',
        size: 0.45,
        color: '#00ffcc',
        speed: 0.012
      },
      {
        lat: 1.29,
        lng: 103.85,
        title: 'Singapore Tanker',
        type: 'Maritime',
        location: 'Singapore Strait',
        details: 'Simulated tanker vessel in major shipping lane.',
        time: 'Live',
        size: 0.45,
        color: '#00ffcc',
        speed: 0.018
      },
      {
        lat: 51.95,
        lng: 4.14,
        title: 'Rotterdam Freight Vessel',
        type: 'Maritime',
        location: 'Port of Rotterdam',
        details: 'Simulated freight vessel near Rotterdam.',
        time: 'Live',
        size: 0.45,
        color: '#00ffcc',
        speed: 0.014
      }
    ]
  }

  setVessels(createVessels())
}, [])

useEffect(() => {
  const interval = setInterval(() => {
    setVessels(prev =>
      prev.map(vessel => ({
        ...vessel,
        lng: vessel.lng + vessel.speed
      }))
    )
  }, 1000)

  return () => clearInterval(interval)
}, [])

  const selectEvent = (event) => {
    setSelectedEvent(event)
    if (globeRef.current) {
      const controls = globeRef.current.controls()
      controls.autoRotate = false
      globeRef.current.pointOfView(
        { lat: event.lat, lng: event.lng, altitude: 1.6 },
        1000
      )
    }
  }

  const selectCorrelation = (item) => {
  setSelectedCorrelation(item)
  setSelectedEvent(null)

  if (globeRef.current && item.cve) {
    const controls = globeRef.current.controls()
    controls.autoRotate = false

    globeRef.current.pointOfView(
      { lat: item.cve.lat, lng: item.cve.lng, altitude: 1.6 },
      1000
    )
  }
}

const isVisible = (type) => selectedFilters.includes(type)

const filteredEvents = events.filter(event =>
  isVisible(event.type)
)

const filteredEarthquakes = isVisible('Earthquake')
  ? earthquakes
  : []

const filteredISS = isVisible('Space Object')
  ? iss
  : []

const allGlobePoints = [
  ...filteredEvents,
  ...filteredEarthquakes,
  ...filteredISS,
  ...(isVisible('Weather Alert') ? globalAlerts : []),
  ...(isVisible('Volcano') ? volcanoes : []),
  ...(isVisible('CVE') ? cves : []),
  ...(isVisible('Cyber Alert') ? kevAlerts : []),
  ...(isVisible('Internet Outage') ? internetOutages : []),
  ...(isVisible('BGP Hijack') ? bgpAlerts : []),
  ...(isVisible('Ransomware') ? ransomwareAlerts : []),
  ...(isVisible('Threat Intel') ? threatIntelAlerts : []),
  ...(isVisible('Data Breach') ? breachAlerts : []),
  ...(isVisible('Aircraft') ? aircraft : []),
  ...(isVisible('Maritime') ? vessels : []),
]

const heatmapPoints = allGlobePoints
  .filter(event =>
    Number.isFinite(event.lat) &&
    Number.isFinite(event.lng) &&
    !event.isOrbitDot
  )
  .map(event => {
    let weight = 1

    if (event.type === 'CVE') weight = 3
    if (event.type === 'Cyber Alert') weight = 5
    if (event.type === 'Ransomware') weight = 4
    if (event.type === 'Threat Intel') weight = 3
    if (event.type === 'Data Breach') weight = 3
    if (event.type === 'Earthquake') weight = 2
    if (event.type === 'Volcano') weight = 3
    if (event.type === 'Internet Outage') weight = 3
    if (event.type === 'BGP Hijack') weight = 4
    if (event.type === 'Aircraft') weight = 1
    if (event.type === 'Maritime') weight = 1

    return {
      ...event,
      weight,
      heatSize: Math.min(1.2, 0.25 + weight * 0.14),
      heatColor:
        weight >= 5
          ? 'rgba(255, 0, 0, 0.75)'
          : weight >= 4
          ? 'rgba(255, 100, 0, 0.65)'
          : weight >= 3
          ? 'rgba(255, 170, 0, 0.55)'
          : 'rgba(0, 191, 255, 0.35)'
    }
  })

const dashboardStats = {
  earthquakes: earthquakes.length,
  volcanoes: volcanoes.length,
  cves: cves.length,
  kevs: kevAlerts.length,
  ransomware: ransomwareAlerts.length,
  threatIntel: threatIntelAlerts.length,
  breaches: breachAlerts.length,
  outages: internetOutages.length,
  bgp: bgpAlerts.length,
  aircraft: aircraft.length,
  maritime: vessels.length
}

const totalActiveEvents =
  earthquakes.length +
  volcanoes.length +
  aircraft.length +
  cves.length +
  kevAlerts.length +
  ransomwareAlerts.length +
  threatIntelAlerts.length +
  breachAlerts.length +
  internetOutages.length +
  bgpAlerts.length +
  vessels.length

const topThreat =
  cves.length > 0
    ? cves.reduce((highest, current) => {
        const currentScore =
          parseFloat(
            current.details.match(/CVSS Score:\s*([\d.]+)/)?.[1] || 0
          )

        const highestScore =
          parseFloat(
            highest.details.match(/CVSS Score:\s*([\d.]+)/)?.[1] || 0
          )

        return currentScore > highestScore ? current : highest
      })
    : null

    const criticalCVEs = cves.filter(event =>
  event.details.includes('Severity: CRITICAL') ||
  event.details.includes('CVSS Score: 9')
).length

const globalRiskScore =
  criticalCVEs * 3 +
  kevAlerts.length * 2 +
  ransomwareAlerts.length * 2 +
  breachAlerts.length +
  threatIntelAlerts.length +
  bgpAlerts.length +
  internetOutages.length

const globalRiskLevel =
  globalRiskScore >= 80
    ? 'CRITICAL'
    : globalRiskScore >= 45
    ? 'HIGH'
    : globalRiskScore >= 20
    ? 'ELEVATED'
    : 'LOW'

const globalRiskColor =
  globalRiskLevel === 'CRITICAL'
    ? '#ff0033'
    : globalRiskLevel === 'HIGH'
    ? '#ff6600'
    : globalRiskLevel === 'ELEVATED'
    ? '#ffaa00'
    : '#00ff99'

const feedHealth = {
  earthquakes: earthquakes.length > 0,
  volcanoes: volcanoes.length > 0,
  spaceWeather: !!spaceWeather,
  iss: iss.length > 0,
  cves: cves.length > 0,
  kev: kevAlerts.length > 0,
  ransomware: ransomwareAlerts.length > 0,
  threatIntel: threatIntelAlerts.length > 0,
  breaches: breachAlerts.length > 0,
  outages: internetOutages.length > 0,
  bgp: bgpAlerts.length > 0,
  aircraft: aircraft.length > 0,
  maritime: vessels.length > 0
}

const getTimeLimit = () => {
  const now = Date.now()

  switch (timelineRange) {
    case '1h':
      return now - (1 * 60 * 60 * 1000)

    case '24h':
      return now - (24 * 60 * 60 * 1000)

    case '7d':
      return now - (7 * 24 * 60 * 60 * 1000)

    case '30d':
      return now - (30 * 24 * 60 * 60 * 1000)

    case '1y':
      return now - (365 * 24 * 60 * 60 * 1000)

    default:
      return 0
  }
}

const extractCveIds = (text = '') => {
  const matches = text.match(/CVE-\d{4}-\d{4,7}/gi)
  return matches ? [...new Set(matches.map(id => id.toUpperCase()))] : []
}

const correlatedThreats = cves.map(cve => {
  const cveId = cve.title

  const matchingKev = kevAlerts.find(kev =>
    kev.title === cveId || extractCveIds(kev.details).includes(cveId)
  )

  const matchingThreatIntel = threatIntelAlerts.find(alert =>
    extractCveIds(`${alert.title} ${alert.details}`).includes(cveId)
  )

  const sources = [
    cve && 'NVD CVE',
    matchingKev && 'CISA KEV',
    matchingThreatIntel && 'Threat Intel'
  ].filter(Boolean)

  const severityScore =
  sources.length >= 3
    ? 95
    : sources.length === 2 && matchingKev
    ? 85
    : sources.length === 2
    ? 70
    : 40

    const correlationReason = [
  matchingKev && 'This CVE appears in the CISA Known Exploited Vulnerabilities feed.',
  matchingThreatIntel && 'This CVE is mentioned in a threat intelligence advisory.'
].filter(Boolean).join('\n')

const priority =
  severityScore >= 90
    ? 'CRITICAL'
    : severityScore >= 75
    ? 'HIGH'
    : severityScore >= 50
    ? 'ELEVATED'
    : 'LOW'

return {
  cveId,
  cve,
  kev: matchingKev,
  threatIntel: matchingThreatIntel,
  sources,
  confidence:
    sources.length >= 3
      ? 'HIGH'
      : sources.length === 2
      ? 'MEDIUM'
      : 'LOW',
  severityScore,
  priority,
  correlationReason
}
}).filter(item => item.sources.length >= 2)

const threatTimeline = [
  ...cves.map(event => ({
    ...event,
    category: 'CVE',
    icon: '🛡️',
    sortTime: Date.parse(event.time) || Date.now()
  })),


  ...kevAlerts.map(event => ({
    ...event,
    category: 'KEV',
    icon: '🚨',
    sortTime: Date.parse(event.time) || Date.now()
  })),

  ...ransomwareAlerts.map(event => ({
    ...event,
    category: 'Ransomware',
    icon: '💀',
    sortTime: Date.parse(event.time) || Date.now()
  })),

  ...threatIntelAlerts.map(event => ({
    ...event,
    category: 'Threat Intel',
    icon: '📡',
    sortTime: Date.parse(event.time) || Date.now()
  })),

  ...breachAlerts.map(event => ({
    ...event,
    category: 'Data Breach',
    icon: '🔓',
    sortTime: Date.parse(event.time) || Date.now()
  })),

  ...internetOutages.map(event => ({
    ...event,
    category: 'Internet Outage',
    icon: '🌐',
    sortTime: Date.parse(event.time) || Date.now()
  })),

  ...bgpAlerts.map(event => ({
    ...event,
    category: 'BGP',
    icon: '🛰️',
    sortTime: Date.parse(event.time) || Date.now()
  }))
]
  .filter(event =>
  !Number.isNaN(event.sortTime) &&
  event.sortTime >= getTimeLimit()
)
  .sort((a, b) => b.sortTime - a.sortTime)
  .slice(0, 20)

  const liveNewsFeed = [
  ...earthquakes.map(event => ({
    text: `🌎 ${event.title} - ${event.location}`,
    time: event.time
  })),

  ...kevAlerts.map(event => ({
    text: `🚨 KEV Added: ${event.title}`,
    time: event.time
  })),

  ...ransomwareAlerts.map(event => ({
    text: `⚠️ Ransomware Victim: ${event.title}`,
    time: event.time
  })),

  ...breachAlerts.map(event => ({
    text: `🔓 Data Breach: ${event.title}`,
    time: event.time
  })),

  ...threatIntelAlerts.map(event => ({
    text: `📡 Threat Intel: ${event.title}`,
    time: event.time
  }))
]
.slice(0, 50)

const askDashboardAssistant = async (modelType = 'original') => {
  if (!assistantQuestion.trim()) return

  setAssistantLoading(true)
  setAssistantAnswer('')
  setAssistantModel(modelType)

  // Helper: strip Three.js internal objects and limit data
  const cleanEvent = (event) => {
    if (!event || typeof event !== 'object') return event
    const { __threeObjPoint, __threeObjLabel, __threeObjDot, ...rest } = event
    return {
      title: rest.title,
      type: rest.type,
      location: rest.location,
      time: rest.time,
      details: rest.details?.slice(0, 200),
      lat: rest.lat,
      lng: rest.lng,
      size: rest.size,
      color: rest.color
    }
  }

  const cleanArray = (arr, limit = 5) => {
    if (!Array.isArray(arr)) return []
    return arr.slice(0, limit).map(cleanEvent)
  }

  const cleanTopThreat = (threat) => {
    if (!threat) return null
    const { __threeObjPoint, __threeObjLabel, __threeObjDot, ...rest } = threat
    return {
      title: rest.title,
      type: rest.type,
      location: rest.location,
      details: rest.details?.slice(0, 300),
      time: rest.time
    }
  }

  const cleanCorrelations = (corrs) => {
    if (!Array.isArray(corrs)) return []
    return corrs.slice(0, 5).map(c => ({
      cveId: c.cveId,
      priority: c.priority,
      confidence: c.confidence,
      sources: c.sources,
      correlationReason: c.correlationReason
    }))
  }

  const dashboardData = {
    globalRiskLevel,
    globalRiskScore,
    topThreat: cleanTopThreat(topThreat),
    correlatedThreats: cleanCorrelations(correlatedThreats),
    dashboardStats,
    feedHealth,
    earthquakes: cleanArray(earthquakes, 5),
    volcanoes: cleanArray(volcanoes, 5),
    cves: cleanArray(cves, 5),
    kevAlerts: cleanArray(kevAlerts, 5),
    ransomwareAlerts: cleanArray(ransomwareAlerts, 5),
    threatIntelAlerts: cleanArray(threatIntelAlerts, 5),
    breachAlerts: cleanArray(breachAlerts, 5),
    internetOutages: cleanArray(internetOutages, 5),
    bgpAlerts: cleanArray(bgpAlerts, 5),
    aircraft: cleanArray(aircraft, 5),
    maritime: cleanArray(vessels, 5)
  }

  const endpoint = modelType === 'deterministic'
    ? 'http://localhost:5050/api/assistant/deterministic'
    : modelType === 'probabilistic'
    ? 'http://localhost:5050/api/assistant/probabilistic'
    : 'http://localhost:5050/api/assistant'

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 240000)

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        question: assistantQuestion,
        dashboard: dashboardData
      }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`)
    }

    const data = await response.json()

    setAssistantAnswer(data.answer || data.error || 'No answer returned.')
  } catch (error) {
    if (error.name === 'AbortError') {
      setAssistantAnswer('Request timed out. The model took too long to respond.')
    } else {
      setAssistantAnswer(`Could not connect to ${modelType} model.`)
    }
  } finally {
    setAssistantLoading(false)
  }
}

const routeWithR3 = async () => {
  if (!r3Query.trim()) return

  setR3Loading(true)
  setR3Result(null)

  try {
    const response = await fetch('http://localhost:5050/api/r3/route', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: r3Query.trim()
      })
    })

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`)
    }

    const data = await response.json()
    setR3Result(data)
  } catch (error) {
    setR3Result({ error: 'R3-Skill routing failed. Check that the Python server is running on port 5051.' })
  } finally {
    setR3Loading(false)
  }
}

  return (
    <div className="dashboard">
      <aside className="panel leftPanel">
        <h2>LIVE EVENTS</h2>
<div className="filterDropdown">
  <button
    className="filterDropdownButton"
    onClick={() => setFiltersOpen(!filtersOpen)}
  >
    All Events
    <span>{filtersOpen ? '▲' : '▼'}</span>
  </button>

  {filtersOpen && (
    <div className="filterGrid">
      <button
        className={
          selectedFilters.includes('All')
            ? 'filterCard active'
            : 'filterCard'
        }
        onClick={() => toggleFilter('All')}
      >
        All
      </button>

      {filterOptions.map(filter => (
        <button
          key={filter}
          className={
            selectedFilters.includes(filter)
              ? 'filterCard active'
              : 'filterCard'
          }
          onClick={() => toggleFilter(filter)}
        >
          {filter}
        </button>
      ))}
    </div>
  )}
</div>

<div className="sectionTitle">CYBER</div>

<div className="scrollList">
  {cves.slice(0, 10).map((event, index) => (
    <div
      className="card clickable"
      key={index}
      onClick={() => selectEvent(event)}
      style={{
        borderLeft: `4px solid ${
          event.color
        }`
      }}
    >
      <strong>{event.title}</strong>
      <span>{event.type}</span>
    </div>
  ))}
</div>

<div className="sectionTitle">KNOWN EXPLOITED</div>

<div className="scrollList">
  {kevAlerts.slice(0, 10).map((event, index) => (
    <div
      className="card clickable"
      key={index}
      onClick={() => selectEvent(event)}
      style={{
        borderLeft: '4px solid #ff0000'
      }}
    >
      <strong>{event.title}</strong>
      <span>{event.location}</span>
    </div>
  ))}
</div>

<div className="sectionTitle">INTERNET OUTAGES</div>

<div className="scrollList">
  {internetOutages.slice(0, 10).map((event, index) => (
    <div className="card clickable" key={index} onClick={() => selectEvent(event)}>
      <strong>{event.title}</strong>
      <span>{event.location}</span>
    </div>
  ))}
</div>

<div className="sectionTitle">BGP ALERTS</div>

<div className="scrollList">
  {bgpAlerts.slice(0, 10).map((event, index) => (
    <div className="card clickable" key={index} onClick={() => selectEvent(event)}>
      <strong>{event.title}</strong>
      <span>{event.location}</span>
    </div>
  ))}
</div>

<div className="sectionTitle">RANSOMWARE</div>

<div className="scrollList">
  {ransomwareAlerts.slice(0, 10).map((event, index) => (
    <div
      className="card clickable"
      key={index}
      onClick={() => selectEvent(event)}
      style={{
        borderLeft: '4px solid #ff0055'
      }}
    >
      <strong>{event.title}</strong>
      <span>{event.location}</span>
    </div>
  ))}
</div>

<div className="sectionTitle">THREAT INTEL</div>

<div className="scrollList">
  {threatIntelAlerts.slice(0, 10).map((event, index) => (
    <div
      className="card clickable"
      key={index}
      onClick={() => selectEvent(event)}
      style={{
        borderLeft: '4px solid #00ffaa'
      }}
    >
      <strong>{event.title}</strong>
      <span>{event.location}</span>
    </div>
  ))}
</div>

<div className="sectionTitle">DATA BREACHES</div>

<div className="scrollList">
  {breachAlerts.slice(0, 10).map((event, index) => (
    <div
      className="card clickable"
      key={index}
      onClick={() => selectEvent(event)}
      style={{
        borderLeft: '4px solid #ff6600'
      }}
    >
      <strong>{event.title}</strong>
      <span>{event.location}</span>
    </div>
  ))}
</div>

<div className="sectionTitle">MARITIME</div>

<div className="scrollList">
  {vessels.map((event, index) => (
    <div
      className="card clickable"
      key={index}
      onClick={() => selectEvent(event)}
      style={{
        borderLeft: '4px solid #00ffcc'
      }}
    >
      <strong>{event.title}</strong>
      <span>{event.location}</span>
    </div>
  ))}
</div>

        <div className="sectionTitle">GENERAL</div>
        {filteredEvents.map((event, index) => (
          <div className="card clickable" key={index} onClick={() => selectEvent(event)}>
            <strong>{event.title}</strong>
            <span>{event.time}</span>
          </div>
        ))}

        <div className="sectionTitle">EARTHQUAKES</div>
        <div className="scrollList">
          {filteredEarthquakes.map((event, index) => (
            <div className="card clickable" key={index} onClick={() => selectEvent(event)}>
              <strong>{event.title}</strong>
              <span>{event.location}</span>
            </div>
          ))}
        </div>

        <div className="sectionTitle">SPACE</div>
{filteredISS
  .filter((event) => !event.isOrbitDot)
  .map((event, index) => (
    <div className="card clickable" key={index} onClick={() => selectEvent(event)}>
      <strong>{event.title}</strong>
      <span>{event.time}</span>
    </div>
  ))}

  <div className="sectionTitle">AIRCRAFT</div>

<div className="scrollList">
  {aircraft.slice(0, 20).map((event, index) => (
    <div
      className="card clickable"
      key={index}
      onClick={() => selectEvent(event)}
      style={{
        borderLeft: '4px solid #ffffff'
      }}
    >
      <strong>{event.title}</strong>
      <span>{event.location}</span>
    </div>
  ))}
</div>
      </aside>

      <main className="globeArea" ref={containerRef}>
        <h1>GLOBAL SITUATION DASHBOARD</h1>

        <Globe
          ref={globeRef}
          width={globeSize.width}
          height={globeSize.height}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
          bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"

          polygonsData={countries}
          polygonCapColor={() => 'rgba(0,0,0,0)'}
          polygonSideColor={() => 'rgba(0,0,0,0)'}
          polygonStrokeColor={() => '#707070'}
          polygonAltitude={0.001}

 /*         pathsData={issTrail}
          pathPoints={(d) => d.points || []}
          pathPointLat={(p) => p.lat}
          pathPointLng={(p) => p.lng}
          pathColor={() => '#00e5ff'}
          pathStroke={1.5}
          pathDashLength={0.03}
          pathDashGap={0.02}
          pathDashAnimateTime={4000}
          pathAltitude={0.08}
*/
          pointsData={allGlobePoints}
          ringsData={showHeatmap ? heatmapPoints : []}
          ringLat="lat"
          ringLng="lng"
          ringColor={(event) => event.heatColor}
          ringMaxRadius={(event) => event.heatSize}
          ringPropagationSpeed={0.4}
          ringRepeatPeriod={1800}
          pointLat="lat"
          pointLng="lng"
          pointColor="color"
          pointAltitude={(point) => point.isOrbitDot ? 0.05 : 0.035}
          
          pointRadius="size"
          pointLabel="title"
          onPointClick={(point) => {
  if (point.isOrbitDot) return
  selectEvent(point)
}}

          objectsData={satellites}
          objectLat="lat"
          objectLng="lng"
          objectAltitude="altitude"
          objectLabel="label"
          objectThreeObject={() => {
            const geometry = new THREE.SphereGeometry(0.45)
            const material = new THREE.MeshBasicMaterial({ color: '#d0d0d0' })
            return new THREE.Mesh(geometry, material)
          }}
        />

<div className="newsTicker">
  <div className="newsTickerContent">
    {liveNewsFeed.map((item, index) => (
      <span key={index}>
        {item.text}
      </span>
    ))}
  </div>
</div>

        {selectedEvent && (
          <div className="popup">
            <button onClick={() => {
              setSelectedEvent(null)
              if (globeRef.current) {
                globeRef.current.controls().autoRotate = true
              }
            }}>×</button>
            <h3>{selectedEvent.title}</h3>
            <p><strong>Type:</strong> {selectedEvent.type}</p>
            <p><strong>Location:</strong> {selectedEvent.location}</p>
            <p><strong>Time:</strong> {selectedEvent.time}</p>
            <p style={{ whiteSpace: 'pre-line' }}>
  {selectedEvent.details}
</p>

{selectedEvent.title === 'International Space Station' && (
  <div style={{ marginTop: '10px', borderTop: '1px solid #444', paddingTop: '10px' }}>
    <p><strong>Crew aboard: {issCrew.number} members</strong></p>

    {issCrew.people.map((person, i) => (
      <p
        key={i}
        style={{ color: '#aaa', fontSize: '12px', margin: '2px 0' }}
      >
        👨‍🚀 {person.name}
      </p>
    ))}
  </div>
)}
          </div>
        )}
      </main>

      <aside className="panel rightPanel">
        <h2>EVENT DETAILS</h2>

        {selectedCorrelation ? (
  <>
    <div className="sectionTitle">CORRELATION DETAIL</div>
    

    <div className="card detailCard">
      <strong>{selectedCorrelation.cveId}</strong>

      <span>Confidence: {selectedCorrelation.confidence}</span>
      <span>Priority: {selectedCorrelation.priority}</span>
      <span>Severity Score: {selectedCorrelation.severityScore}</span>
      <span>Sources: {selectedCorrelation.sources.join(' → ')}</span>

      <p style={{ whiteSpace: 'pre-line' }}>
        {selectedCorrelation.cve.details}
      </p>
    </div>

    <p style={{ whiteSpace: 'pre-line' }}>
  {selectedCorrelation.correlationReason}
</p>

    {selectedCorrelation.kev && (
      <div className="card detailCard">
        <strong>CISA KEV Match</strong>
        <span>{selectedCorrelation.kev.location}</span>
        <span>{selectedCorrelation.kev.time}</span>
        <p style={{ whiteSpace: 'pre-line' }}>
          {selectedCorrelation.kev.details}
        </p>
      </div>
    )}

    {selectedCorrelation.threatIntel && (
      <div className="card detailCard">
        <strong>Threat Intel Match</strong>
        <span>{selectedCorrelation.threatIntel.title}</span>
        <span>{selectedCorrelation.threatIntel.time}</span>
        <p style={{ whiteSpace: 'pre-line' }}>
          {selectedCorrelation.threatIntel.details}
        </p>
      </div>
    )}

    <button
      className="clearButton"
      onClick={() => {
        setSelectedCorrelation(null)
        if (globeRef.current) {
          globeRef.current.controls().autoRotate = true
        }
      }}
    >
      Deselect Correlation
    </button>
  </>
) : selectedEvent ? (
          <>
            <div className="sectionTitle">SELECTED EVENT</div>
            <div className="card detailCard">
              <strong>{selectedEvent.title}</strong>
              <span>{selectedEvent.type}</span>
              <span>{selectedEvent.location}</span>
              <span>{selectedEvent.time}</span>
              <p style={{ whiteSpace: 'pre-line' }}>
  {selectedEvent.details}
</p>
              {selectedEvent.title === 'International Space Station' && (
  <div style={{ marginTop: '10px', borderTop: '1px solid #444', paddingTop: '10px' }}>
    <p><strong>Crew aboard: {issCrew.number} members</strong></p>

    {issCrew.people.map((person, i) => (
      <p
        key={i}
        style={{ color: '#aaa', fontSize: '12px', margin: '2px 0' }}
      >
        👨‍🚀 {person.name} ({person.craft})
      </p>
    ))}
  </div>
)}
            </div>
            <button
              className="clearButton"
              onClick={() => {
                setSelectedEvent(null)
                if (globeRef.current) {
                  globeRef.current.controls().autoRotate = true
                }
              }}
            >
              Deselect Event
            </button>
          </>
        ) : (
          <>
            <div className="sectionTitle">STATUS</div>
            <div className="card">
  <strong>Active Events</strong>
  <div style={{
    fontSize: '28px',
    marginTop: '10px',
    color: '#00bfff',
    fontWeight: 'bold'
  }}>
    {totalActiveEvents}
  </div>
</div>
            <div className="card">No event selected</div>

            <div className="sectionTitle">INTELLIGENCE SUMMARY</div>

<div className="sectionTitle">AI DASHBOARD ASSISTANT</div>

<div className="card detailCard">
  <textarea
    value={assistantQuestion}
    onChange={(e) => setAssistantQuestion(e.target.value)}
    placeholder="Ask the dashboard something..."
    className="assistantInput"
  />

  <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
    <button
      className="clearButton"
      onClick={() => askDashboardAssistant('original')}
      disabled={assistantLoading}
      style={{ flex: 1, fontSize: '11px' }}
    >
      {assistantLoading && assistantModel === 'original' ? 'Thinking...' : 'Original'}
    </button>
    <button
      className="clearButton"
      onClick={() => askDashboardAssistant('deterministic')}
      disabled={assistantLoading}
      style={{ flex: 1, fontSize: '11px', backgroundColor: assistantModel === 'deterministic' ? '#00bfff' : '', color: assistantModel === 'deterministic' ? '#000' : '' }}
    >
      {assistantLoading && assistantModel === 'deterministic' ? 'Thinking...' : 'Deterministic'}
    </button>
    <button
      className="clearButton"
      onClick={() => askDashboardAssistant('probabilistic')}
      disabled={assistantLoading}
      style={{ flex: 1, fontSize: '11px', backgroundColor: assistantModel === 'probabilistic' ? '#ffaa00' : '', color: assistantModel === 'probabilistic' ? '#000' : '' }}
    >
      {assistantLoading && assistantModel === 'probabilistic' ? 'Thinking...' : 'Probabilistic'}
    </button>
  </div>

  {assistantAnswer && (
    <div className="assistantAnswer" style={{ marginTop: '15px' }}>
      <div style={{ 
        fontSize: '10px', 
        textTransform: 'uppercase', 
        letterSpacing: '1px',
        color: assistantModel === 'deterministic' ? '#00bfff' : assistantModel === 'probabilistic' ? '#ffaa00' : '#888',
        marginBottom: '8px',
        fontWeight: 'bold'
      }}>
        Model: {assistantModel === 'original' ? 'Original Assistant' : assistantModel === 'deterministic' ? 'Model A — Deterministic' : 'Model B — Probabilistic'}
      </div>
      <ReactMarkdown>{assistantAnswer}</ReactMarkdown>
    </div>
  )}
</div>

<div className="sectionTitle">R3-SKILL ROUTER (Model C)</div>

<div className="card detailCard">
  <textarea
    value={r3Query}
    onChange={(e) => setR3Query(e.target.value)}
    placeholder="Describe an event to find the best response skill..."
    className="assistantInput"
  />

  <button
    className="clearButton"
    onClick={routeWithR3}
    disabled={r3Loading}
    style={{ marginTop: '8px', width: '100%' }}
  >
    {r3Loading ? 'Routing...' : 'Find Best Skill'}
  </button>

  {r3Result?.best_skill && (
    <div style={{ marginTop: '12px', borderTop: '1px solid #444', paddingTop: '10px' }}>
      <div style={{ 
        fontSize: '10px', 
        textTransform: 'uppercase', 
        letterSpacing: '1px',
        color: '#00ffaa',
        marginBottom: '6px',
        fontWeight: 'bold'
      }}>
        Model: Model C — Tencent R3-Skill
      </div>
      <p style={{ margin: '4px 0' }}><strong>Matched Skill:</strong> <span style={{ color: '#00ffaa' }}>{r3Result.best_skill.name}</span></p>
      <p style={{ margin: '4px 0', fontSize: '12px' }}><strong>Confidence:</strong> {r3Result.best_skill.confidence}</p>
      <p style={{ margin: '4px 0', fontSize: '11px', color: '#aaa' }}>{r3Result.best_skill.description}</p>
      
      {r3Result.top_matches && r3Result.top_matches.length > 1 && (
        <div style={{ marginTop: '8px' }}>
          <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: '#888' }}>Top Matches:</p>
          {r3Result.top_matches.slice(1).map((match, i) => (
            <p key={i} style={{ fontSize: '11px', color: '#aaa', margin: '2px 0' }}>
              {i + 2}. {match.name} (rerank: {match.rerank_score})
            </p>
          ))}
        </div>
      )}
    </div>
  )}

  {r3Result?.error && (
    <p style={{ color: '#ff4444', marginTop: '10px', fontSize: '12px' }}>
      {r3Result.error}
    </p>
  )}
</div>

            <button
  className="clearButton"
  onClick={() => setShowHeatmap(!showHeatmap)}
>
  {showHeatmap ? 'Hide Threat Heatmap' : 'Show Threat Heatmap'}
</button>

            <div className="sectionTitle">GLOBAL RISK LEVEL</div>

<div className="card detailCard">
  <strong
    style={{
      color: globalRiskColor,
      fontSize: '24px',
      letterSpacing: '2px'
    }}
  >
    {globalRiskLevel}
  </strong>

  <span>Risk Score: {globalRiskScore}</span>
  <span>Critical CVEs: {criticalCVEs}</span>
  <span>KEV Alerts: {kevAlerts.length}</span>
  <span>Ransomware: {ransomwareAlerts.length}</span>
  <span>Data Breaches: {breachAlerts.length}</span>
</div>

            <div className="sectionTitle">TOP THREAT</div>

<div className="card detailCard">
  {topThreat ? (
    <>
      <strong>{topThreat.title}</strong>

      <span style={{
        color: '#ff4444',
        fontWeight: 'bold',
        marginTop: '10px'
      }}>
        CRITICAL THREAT
      </span>

      <p style={{
        whiteSpace: 'pre-line',
        marginTop: '10px'
      }}>
        {topThreat.details}
      </p>
    </>
  ) : (
    <span>No active threats</span>
  )}
</div> 



            <div className="card detailCard">
              <span>Earthquakes: {dashboardStats.earthquakes}</span>
              <span>Volcanoes: {dashboardStats.volcanoes}</span>
              <span>Aircraft: {dashboardStats.aircraft}</span>
              <span>Maritime: {dashboardStats.maritime}</span>
              <span>CVEs: {dashboardStats.cves}</span>
              <span>Known Exploited: {dashboardStats.kevs}</span>
              <span>Ransomware: {dashboardStats.ransomware}</span>
              <span>Threat Intel: {dashboardStats.threatIntel}</span>
              <span>Data Breaches: {dashboardStats.breaches}</span>
              <span>Internet Outages: {dashboardStats.outages}</span>
              <span>BGP Events: {dashboardStats.bgp}</span>
            </div>

              <div className="sectionTitle">FEED HEALTH</div>

              <div className="card detailCard">

                <span>{feedHealth.spaceWeather ? '🟢' : '🔴'} Space Weather</span>

                <span>{feedHealth.earthquakes ? '🟢' : '🔴'} Earthquakes</span>

                <span>{feedHealth.volcanoes ? '🟢' : '🔴'} Volcanoes</span>

                <span>{feedHealth.iss ? '🟢' : '🔴'} ISS Tracking</span>

                <span>{feedHealth.cves ? '🟢' : '🔴'} CVE Feed</span>

                <span>{feedHealth.kev ? '🟢' : '🔴'} KEV Feed</span>

                <span>{feedHealth.ransomware ? '🟢' : '🔴'} Ransomware Feed</span>

                <span>{feedHealth.threatIntel ? '🟢' : '🔴'} Threat Intel Feed</span>

                <span>{feedHealth.outages ? '🟢' : '🔴'} Internet Outages</span>

                <span>{feedHealth.bgp ? '🟢' : '🔴'} BGP Monitoring</span>

                <span>{feedHealth.breaches ? '🟢' : '🔴'} Data Breach Feed</span>

                <span>{feedHealth.aircraft ? '🟢' : '🔴'} Aircraft Tracking</span>

                <span>{feedHealth.maritime ? '🟢' : '🔴'} Maritime Tracking</span>

              </div>

<div className="timelineFilters">

  <button
    className={timelineRange === '1h' ? 'activeTime' : ''}
    onClick={() => setTimelineRange('1h')}
  >
    1H
  </button>

  <button
    className={timelineRange === '24h' ? 'activeTime' : ''}
    onClick={() => setTimelineRange('24h')}
  >
    24H
  </button>

  <button
    className={timelineRange === '7d' ? 'activeTime' : ''}
    onClick={() => setTimelineRange('7d')}
  >
    7D
  </button>

  <button
    className={timelineRange === '30d' ? 'activeTime' : ''}
    onClick={() => setTimelineRange('30d')}
  >
    30D
  </button>

  <button
    className={timelineRange === '1y' ? 'activeTime' : ''}
    onClick={() => setTimelineRange('1y')}
  >
    1Y
  </button>

</div>

              <div className="sectionTitle">THREAT TIMELINE</div>



<div className="timelineList">
  {threatTimeline.length > 0 ? (
    threatTimeline.map((event, index) => (
      <div
        className="timelineItem clickable"
        key={index}
        onClick={() => selectEvent(event)}
      >
        <div className="timelineDot">
          {event.icon}
        </div>

        <div className="timelineContent">
          <strong>{event.title}</strong>

          <span>{event.category}</span>

          <small>
            {new Date(event.sortTime).toLocaleString()}
          </small>
        </div>
      </div>
    ))
  ) : (
    <div className="card">
      No timeline events available
    </div>
  )}
</div>

<div className="sectionTitle">CORRELATED THREATS</div>

<div className="timelineList">
  {correlatedThreats.length > 0 ? (
    correlatedThreats.map((item, index) => (
      <div
        className="timelineItem clickable"
        key={index}
        onClick={() => selectCorrelation(item)}
      >
        <div className="timelineDot">🔗</div>

        <div className="timelineContent">
          <strong>{item.cveId}</strong>
          <span>{item.sources.join(' → ')}</span>
          <small>{item.priority} | Confidence: {item.confidence}</small>
        </div>
      </div>
    ))
  ) : (
    <div className="card">
      No verified correlations found
    </div>
  )}
</div>


          </>
        )}
      </aside>

    </div>
  )
}


export default App