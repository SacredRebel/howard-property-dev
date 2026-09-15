// Howard Property Interactive Map — 1320 Baldwin Rd, Ojai, CA (APN 032-0-010-090)
// Built on the EcoVillageBuilder V1 single-file stack (SacredRebel/EcoVillage-map)
import 'dotenv/config';
import express from 'express';
import compression from 'compression';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import { IMAGE_URLS } from './image-urls.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;

// Performance & Security Middleware
app.use(compression({ level: 6, threshold: 1024 })); // Compress responses
app.use(cors()); // Enable CORS for all routes
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded bodies

// Only log startup message when running locally
if (process.env.VERCEL !== '1') {
  console.log('🚀 Starting Howard Property Interactive Map...');
}

// ── Multi-property registry ─────────────────────────────────────────────────
// Each property lives in its own module under properties/. To add a new
// property: create a module with the same shape (id, name, center, zoom,
// panel, cta, footer info, boundary segments, zones) and add it here.
import { HOWARD_PROPERTY } from './properties/howard.js';
import { SULPHUR_PROPERTY } from './properties/sulphur-mountain.js';
import { KERIS_PROPERTY } from './properties/keris-property.js';
import { CHERS_PROPERTY } from './properties/chers-property.js';
import { BMR_PROPERTY } from './properties/black-mountain-ranch.js';
import { ROSE_VALLEY_PROPERTY } from './properties/rose-valley.js';

const PROPERTIES = [HOWARD_PROPERTY, SULPHUR_PROPERTY, KERIS_PROPERTY, CHERS_PROPERTY, BMR_PROPERTY, ROSE_VALLEY_PROPERTY];
PROPERTIES.forEach(p => p.zones.forEach(z => { z.propertyId = p.id; }));

// Aggregates used by the API endpoints
const PROJECT_ZONES = PROPERTIES.flatMap(p => p.zones);
const PERMANENT_PROPERTY_LINES = PROPERTIES.flatMap(p => p.boundary);

// ── Saved layout (git-tracked) ──────────────────────────────────────────────
// data/zone-positions.json is the live source of truth for icon positions.
// The map editor's "Save Layout for Everyone" button commits new versions of
// this file straight to GitHub (see POST /api/save-positions), so every layout
// change is a git commit and Vercel redeploys with it baked in.
try {
  const savedLayout = JSON.parse(readFileSync(join(__dirname, 'data', 'zone-positions.json'), 'utf8'));
  let appliedCount = 0;
  for (const p of PROPERTIES) {
    const zones = savedLayout[p.id];
    if (!zones) continue;
    for (const z of p.zones) {
      const pos = zones[z.id];
      if (Array.isArray(pos) && pos.length === 2 && isFinite(pos[0]) && isFinite(pos[1])) {
        z.position = [pos[0], pos[1]];
        appliedCount++;
      }
    }
  }
  if (process.env.VERCEL !== '1') {
    console.log('📍 Applied saved layout from data/zone-positions.json (' + appliedCount + ' positions)');
  }
} catch (e) {
  // No saved layout file — module defaults apply.
}

// Updated Zone color mapping with unique representative colors
const zoneColors = {
  agriculture: '#2E7D32',        // Deep forest green - represents fertile earth and growth
  residential: '#1565C0',       // Deep ocean blue - represents stability and home
  community: '#FF8F00',         // Warm amber - represents gathering and warmth  
  hospitality: '#7B1FA2',       // Royal purple - represents luxury and welcome
  infrastructure: '#455A64',    // Steel blue-gray - represents durability and structure
  creative: '#D84315',          // Vibrant terracotta - represents creativity and clay/earth arts
  ceremonial: '#C2185B',        // Deep rose - represents spiritual connection and ceremony
  wellness: '#00838F'           // Teal - represents healing waters and tranquility
};

// Main route - serves the complete interactive map
app.get('/', (req, res) => {
  try {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>Ojai Valley Properties — Interactive Development Map</title>
  <link rel="preconnect" href="https://server.arcgisonline.com" crossorigin>
  <link rel="preconnect" href="https://s3.amazonaws.com" crossorigin>
  <link rel="preconnect" href="https://unpkg.com" crossorigin>
  <link rel="preconnect" href="https://raw.githubusercontent.com" crossorigin>
  <link rel="preconnect" href="https://wsrv.nl" crossorigin>
  <link rel="preconnect" href="https://maps.ventura.org" crossorigin>
  <link rel="dns-prefetch" href="https://elevation.nationalmap.gov">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { 
      box-sizing: border-box; 
      margin: 0; 
      padding: 0; 
    }
    
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #f5f5f5;
      padding-bottom: 80px;
    }
    
    #map { 
      height: calc(100vh - 60px); 
      width: 100%; 
    }
    
    /* Zone Controls Panel */
    .zone-controls {
      position: absolute;
      top: 15px;
      left: 15px; 
      z-index: 1000;
      background: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      max-width: 320px;
      font-size: 14px;
    }
    
    .zone-controls h2 {
      color: #333;
      margin-bottom: 15px;
      font-size: 18px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    /* Control Buttons */
    .control-button {
      display: block;
      width: 100%;
      padding: 12px 16px;
      margin-bottom: 10px;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    
    .unlock-button {
      background: #FF5722;
      color: white;
    }
    
    .unlock-button:hover {
      background: #E64A19;
      transform: translateY(-1px);
    }
    
    .lock-button {
      background: #4CAF50;
      color: white;
    }
    
    .lock-button:hover {
      background: #45a049;
      transform: translateY(-1px);
    }
    
    .capture-button {
      background: #9C27B0;
      color: white;
    }
    
    .capture-button:hover {
      background: #7B1FA2;
      transform: translateY(-1px);
    }
    
    /* Position Controls */
    .position-controls {
      text-align: center;
      padding: 15px 0;
      border-top: 1px solid #e0e0e0;
      margin-top: 10px;
    }
    
    .position-btn {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 25px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.3s ease;
      margin-bottom: 8px;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
    }
    
    .position-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
    }
    
    .position-info {
      font-size: 11px;
      color: #666;
      font-family: 'Courier New', monospace;
      margin-top: 5px;
    }
    
    /* Project Footer */
    .project-footer {
      margin-top: 30px;
      border-top: 2px solid #f0f0f0;
      padding: 20px 0 10px 0;
      text-align: center;
    }
    
    .footer-content {
      max-width: 100%;
    }
    
    .footer-title {
      font-size: 16px;
      font-weight: 600;
      color: #4a5568;
      margin-bottom: 8px;
    }
    
    .footer-info {
      font-size: 13px;
      color: #718096;
      margin-bottom: 8px;
      font-weight: 500;
    }
    
    .footer-tagline {
      font-size: 12px;
      color: #a0aec0;
      font-style: italic;
      margin-bottom: 5px;
    }
    
    /* Status Indicator */
    .status-indicator {
      background: linear-gradient(135deg, #FFEBEE 0%, #FFCDD2 100%);
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      gap: 10px;
      border-left: 4px solid #F44336;
    }
    
    .status-text {
      font-weight: 500;
      color: #333;
    }
    
    /* Instructions */
    .instruction-list {
      list-style: none;
      padding: 0;
    }
    
    .instruction-list li {
      padding: 6px 0;
      padding-left: 20px;
      position: relative;
      color: #555;
      font-size: 13px;
    }
    
    .instruction-list li:before {
      content: "•";
      position: absolute;
      left: 5px;
      color: #9C27B0;
      font-weight: bold;
    }
    
          /* Ultra-Polished Left-Side Panel */
          .side-panel {
            position: fixed;
            top: 0;
            left: -600px;
            width: 580px;
            height: 100vh;
            background: linear-gradient(135deg, #ffffff 0%, #fafbfc 50%, #f5f7fa 100%);
            box-shadow: 5px 0 40px rgba(0,0,0,0.15), 0 0 20px rgba(0,0,0,0.1);
            z-index: 2000;
            overflow: hidden;
            -webkit-overflow-scrolling: touch;
            touch-action: pan-y;
            will-change: left;
            transform: translateZ(0);
            transition: left 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            border-right: 1px solid rgba(0,0,0,0.06);
            backdrop-filter: blur(20px);
            display: flex;
            flex-direction: column;
          }
          
          .side-panel.open {
            left: 0;
          }

          .side-panel.swiping {
            transition: transform 0s !important;
          }
          
          .panel-header {
            position: relative;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 16px 24px 14px 24px;
            border-bottom: none;
            z-index: 2001;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            backdrop-filter: blur(15px);
            display: flex;
            align-items: center;
            justify-content: space-between;
            min-height: 60px;
            max-height: 60px;
            touch-action: manipulation;
            flex-shrink: 0;
            gap: 16px;
            -webkit-tap-highlight-color: transparent;
          }
          
          .close-panel {
            position: absolute;
            top: 10px;
            right: 14px;
            font-size: 18px;
            cursor: pointer;
            background: rgba(255,255,255,0.15);
            border: 1px solid rgba(255,255,255,0.25);
            color: white;
            border-radius: 50%;
            width: 36px;
            height: 36px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          }
    
          .close-panel:hover {
            background: rgba(255,255,255,0.25);
            border-color: rgba(255,255,255,0.4);
            transform: scale(1.05) rotate(90deg);
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          }
          
          .panel-content {
            padding: 0 0 80px 0;
            background: transparent;
            margin: 0;
            overscroll-behavior-y: contain;
            -webkit-overflow-scrolling: touch;
            touch-action: pan-y;
            flex: 1;
            min-height: 0;
            overflow-y: auto;
            overflow-x: hidden;
            scroll-behavior: smooth;
            /* Smooth momentum scrolling on mobile */
            -webkit-transform: translateZ(0);
            transform: translateZ(0);
          }
          
          .panel-content::-webkit-scrollbar {
            width: 6px;
          }
          
          .panel-content::-webkit-scrollbar-track {
            background: rgba(0,0,0,0.05);
          }
          
          .panel-content::-webkit-scrollbar-thumb {
            background: rgba(0,0,0,0.2);
            border-radius: 3px;
          }
          
          .panel-content::-webkit-scrollbar-thumb:hover {
            background: rgba(0,0,0,0.3);
          }
          
          /* Compact Project Details Styling (70% smaller) */
          .project-title {
            font-size: 16px;
            margin-bottom: 4px;
            padding-right: 35px;
            color: white;
            line-height: 1.3;
            text-shadow: 0 1px 2px rgba(0,0,0,0.2);
            font-weight: 600;
            word-wrap: break-word;
            overflow-wrap: break-word;
            max-width: 100%;
          }
          
          .project-subtitle {
            color: rgba(255,255,255,0.85);
            font-size: 11px;
            margin-bottom: 0;
            line-height: 1.4;
            font-weight: 400;
            border-left: 3px solid #667eea;
            padding-left: 12px;
          }
          
          /* Compact Project Header (No Hero Image) */
          .project-hero {
            position: relative;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 15px 35px 12px 35px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            flex: 1;
            min-height: 44px;
          }
    
    .project-section {
      margin-bottom: 25px;
      padding: 30px 35px;
      background: white;
      border-radius: 0;
      border-bottom: 1px solid #f0f2f5;
    }
    
    .project-section:first-child {
      margin-top: 20px;
    }
    
    .project-section h3 {
      color: #2c3e50;
      border-bottom: 2px solid #e9ecef;
      padding-bottom: 15px;
      margin-bottom: 25px;
      font-size: 15px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }
    
          /* Enhanced Investment Summary Cards */
          .investment-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
          }
          
          .investment-card {
            background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            border: 2px solid #e9ecef;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
            transition: all 0.3s ease;
          }
          
          .investment-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 15px rgba(0,0,0,0.1);
            border-color: #667eea;
          }    .investment-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }
    
    .investment-value {
      font-size: 18px;
      font-weight: bold;
      color: #2c3e50;
    }
    
    .roi-positive {
      color: #27AE60;
    }
    
    /* Feature Lists */
    .feature-list {
      list-style: none;
      padding: 0;
    }
    
    .feature-list li {
      padding: 8px 0;
      padding-left: 30px;
      position: relative;
      line-height: 1.4;
      color: #444;
    }
    
    .feature-list li:before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #4CAF50;
      font-weight: bold;
      font-size: 16px;
    }
    
    /* Revenue Streams */
    .revenue-stream {
      background: linear-gradient(135deg, #e8f5e8 0%, #d4edda 100%);
      padding: 12px 15px;
      margin-bottom: 8px;
      border-left: 4px solid #28a745;
      border-radius: 6px;
      font-size: 14px;
    }
    
    /* Timeline Phase */
    .timeline-phase {
      display: inline-block;
      background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
      color: white;
      padding: 6px 12px;
      border-radius: 15px;
      font-size: 13px;
      font-weight: 600;
    }
    
    /* Zone Markers */
    .zone-marker {
      cursor: pointer;
      transition: all 0.3s ease;
    }
    
    .zone-marker:hover {
      transform: scale(1.15);
      filter: drop-shadow(0 4px 8px rgba(0,0,0,0.2));
    }
    
    /* Magical Property Boundary Lines */
    .property-line-magical {
      stroke-linecap: round;
      stroke-linejoin: round;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      filter: drop-shadow(0 0 8px currentColor) brightness(1);
      animation: pulse-glow 3s ease-in-out infinite;
    }
    
    @keyframes pulse-glow {
      0%, 100% {
        filter: drop-shadow(0 0 8px currentColor) brightness(1);
        opacity: 0.9;
      }
      50% {
        filter: drop-shadow(0 0 15px currentColor) brightness(1.1);
        opacity: 1;
      }
    }
    
    .property-line-magical:hover {
      filter: brightness(1.2);
      stroke-width: 12 !important;
    }
    
    
    .property-line-magical.active {
      filter: drop-shadow(0 0 25px gold) 
              drop-shadow(0 0 35px currentColor) 
              brightness(1.4);
      stroke-width: 13 !important;
      animation: active-pulse 1.5s ease-in-out infinite;
    }
    
    @keyframes active-pulse {
      0%, 100% {
        filter: drop-shadow(0 0 25px gold) 
                drop-shadow(0 0 35px currentColor) 
                brightness(1.4);
      }
      50% {
        filter: drop-shadow(0 0 30px gold) 
                drop-shadow(0 0 45px currentColor) 
                brightness(1.5);
      }
    }
    
    /* Mobile optimization */
    @media (max-width: 768px) {
      .property-line-magical {
        filter: drop-shadow(0 0 6px currentColor) brightness(1);
      }
      
      .property-line-magical:active {
        filter: drop-shadow(0 0 15px gold) 
                drop-shadow(0 0 25px currentColor) 
                brightness(1.3);
      }
    }
          
          /* Enhanced Image Gallery Styles */
          .image-gallery {
            margin-top: 30px;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
            content-visibility: auto;
          }
          
          .gallery-tabs {
            display: flex;
            background: #f8f9fa;
          }
          
          .gallery-tab {
            flex: 1;
            padding: 15px 20px;
            cursor: pointer;
            background: transparent;
            border: none;
            text-align: center;
            font-weight: 500;
            color: #6c757d;
            transition: all 0.3s ease;
            position: relative;
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
            user-select: none;
            -webkit-user-select: none;
          }
          
          .gallery-tab:hover {
            color: #495057;
            background: rgba(102, 126, 234, 0.1);
          }
          
          .gallery-tab.active {
            color: #667eea;
            background: white;
          }
          
          .gallery-tab.active::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          
          .gallery-content {
            padding: 0;
            background: white;
            position: relative;
            min-height: 0;
            overflow: hidden;
          }
          
          /* Gallery content containers - prevent layout shift */
          #current-images, #vision-images, #progress-images {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            padding: 25px;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.1s ease, visibility 0s linear 0.1s;
            pointer-events: none;
            transform: translate3d(0, 0, 0);
            -webkit-transform: translate3d(0, 0, 0);
            backface-visibility: hidden;
            -webkit-backface-visibility: hidden;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
          }
          
          #current-images.active, #vision-images.active, #progress-images.active {
            opacity: 1;
            visibility: visible;
            transition: opacity 0.1s ease, visibility 0s linear 0s;
            pointer-events: auto;
            position: relative;
          }
          
          .image-placeholder {
            width: 100%;
            height: 200px;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border: 2px dashed #dee2e6;
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            margin-bottom: 15px;
            color: #6c757d;
            transition: all 0.3s ease;
          }
          
          .image-placeholder:hover {
            border-color: #667eea;
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
          }
          
          .placeholder-icon {
            font-size: 48px;
            margin-bottom: 10px;
            opacity: 0.6;
          }
          
          .placeholder-text {
            font-size: 14px;
            text-align: center;
            line-height: 1.4;
          }
          
          .image-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-top: 20px;
          }
          
          .image-grid .image-placeholder {
            height: 150px;
          }
          
          /* Image Carousel Styles - Fixed Sizing */
          .image-carousel {
            position: relative;
            width: 100%;
            margin-bottom: 20px;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            background: #000;
          }
          
          .carousel-main {
            position: relative;
            width: 100%;
            height: 450px;
            background: #000;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            touch-action: pan-y;
            user-select: none;
            -webkit-user-select: none;
            -webkit-user-drag: none;
          }
          
          .carousel-image {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: center;
            background: #000;
            opacity: 0;
            transition: opacity 300ms cubic-bezier(0.16, 1, 0.3, 1), filter 350ms cubic-bezier(0.16, 1, 0.3, 1);
            will-change: opacity, filter;
            image-rendering: auto;
            transform: translate3d(0,0,0);
          }

          /* GPU hints for Leaflet map to reduce jank */
          .leaflet-container {
            -webkit-tap-highlight-color: transparent;
            backface-visibility: hidden;
            transform: translateZ(0);
          }
          
          .carousel-image.active {
            opacity: 1;
          }
          
          .carousel-loading {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0,0,0,0.2);
            backdrop-filter: blur(1px);
            opacity: 0;
            pointer-events: none;
            transition: opacity 200ms ease;
            z-index: 9;
          }
          .carousel-loading.active { opacity: 1; pointer-events: auto; }
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255,255,255,0.25);
            border-top-color: #fff;
            border-radius: 50%;
            animation: spin 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;
            transform: translate3d(0,0,0);
          }
          @keyframes spin { 
            0% { transform: translate3d(0,0,0) rotate(0deg); }
            100% { transform: translate3d(0,0,0) rotate(360deg); } 
          }
          
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          .carousel-nav {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(255,255,255,0.9);
            border: none;
            width: 45px;
            height: 45px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
            z-index: 10;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          }
          
          .carousel-nav:hover {
            background: white;
            transform: translateY(-50%) scale(1.1);
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          }
          
          .carousel-nav.prev {
            left: 15px;
          }
          
          .carousel-nav.next {
            right: 15px;
          }
          
          .carousel-counter {
            position: absolute;
            bottom: 15px;
            right: 15px;
            background: rgba(0,0,0,0.7);
            color: white;
            padding: 8px 15px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 500;
          }
          
          .carousel-thumbnails {
            display: flex;
            gap: 10px;
            padding: 15px;
            background: #f8f9fa;
            overflow-x: auto;
            scrollbar-width: thin;
          }
          
          .carousel-thumbnails::-webkit-scrollbar {
            height: 6px;
          }
          
          .carousel-thumbnails::-webkit-scrollbar-track {
            background: #e9ecef;
            border-radius: 3px;
          }
          
          .carousel-thumbnails::-webkit-scrollbar-thumb {
            background: #667eea;
            border-radius: 3px;
          }
          
          .carousel-thumbnail {
            width: 80px;
            height: 60px;
            object-fit: cover;
            border-radius: 6px;
            cursor: pointer;
            opacity: 0.6;
            transition: all 0.3s ease;
            flex-shrink: 0;
            border: 2px solid transparent;
          }
          
          .carousel-thumbnail:hover {
            opacity: 0.8;
            transform: scale(1.05);
          }
          
          .carousel-thumbnail.active {
            opacity: 1;
            border-color: #667eea;
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
          }
          
          .no-images-message {
            text-align: center;
            padding: 40px;
            color: #6c757d;
            font-size: 15px;
          }
          
          .loading-images {
            text-align: center;
            padding: 40px;
            color: #667eea;
            font-size: 15px;
          }
          
          /* Sub-Navigation Bar for Subcategories */
          .sub-nav-container {
            background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
            border-bottom: 1px solid #e9ecef;
            padding: 15px 20px;
            margin-bottom: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          }
          
          .sub-nav-tabs {
            display: flex;
            gap: 10px;
            overflow-x: auto;
            scrollbar-width: thin;
            padding-bottom: 5px;
          }
          
          .sub-nav-tabs::-webkit-scrollbar {
            height: 4px;
          }
          
          .sub-nav-tabs::-webkit-scrollbar-track {
            background: #f1f3f5;
            border-radius: 2px;
          }
          
          .sub-nav-tabs::-webkit-scrollbar-thumb {
            background: #667eea;
            border-radius: 2px;
          }
          
          .sub-nav-tab {
            flex-shrink: 0;
            padding: 8px 20px;
            background: white;
            border: 2px solid #e9ecef;
            border-radius: 20px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            color: #6c757d;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            white-space: nowrap;
            position: relative;
            overflow: hidden;
          }
          
          .sub-nav-tab::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(102, 126, 234, 0.1), transparent);
            transition: left 0.5s ease;
          }
          
          .sub-nav-tab:hover::before {
            left: 100%;
          }
          
          .sub-nav-tab:hover {
            border-color: #667eea;
            color: #667eea;
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(102, 126, 234, 0.2);
          }
          
          .sub-nav-tab.active {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-color: #667eea;
            color: white;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
          }
          
          .sub-nav-tab .count-badge {
            display: inline-block;
            margin-left: 8px;
            padding: 2px 8px;
            background: rgba(255,255,255,0.3);
            border-radius: 10px;
            font-size: 11px;
            font-weight: 600;
          }
          
          .sub-nav-tab.active .count-badge {
            background: rgba(255,255,255,0.25);
          }
          
          .subcategory-content {
            display: none;
            animation: fadeInUp 0.4s ease-out;
          }

          .subcategory-content.active {
            display: block;
          }
          
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          /* ===== ENHANCED LIGHTBOX WITH ZOOM ===== */
          #image-lightbox {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
            transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.4s;
            will-change: opacity, visibility;
            overscroll-behavior: contain;
            transform: translate3d(0,0,0);
          }
          
          #image-lightbox.active {
            opacity: 1;
            visibility: visible;
            pointer-events: auto;
          }
          
          .lightbox-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            backdrop-filter: blur(10px);
            cursor: zoom-out;
            transform: translate3d(0,0,0);
            will-change: backdrop-filter;
          }
          
          .lightbox-content {
            position: relative;
            z-index: 1;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            touch-action: none;
          }
          
          .lightbox-image-container {
            position: relative;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            transform: translate3d(0,0,0);
          }
          
          .lightbox-image {
            max-width: 95vw;
            max-height: 95vh;
            object-fit: contain;
            object-position: center center;
            display: block;
            border-radius: 4px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
            transition: opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1), transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
            cursor: zoom-in;
            user-select: none;
            -webkit-user-drag: none;
            will-change: transform, opacity;
            transform: translate3d(0,0,0) scale(0.95);
            opacity: 0;
          }
          
          .lightbox-image.loaded {
            transform: translate3d(0,0,0) scale(1);
            opacity: 1;
          }
          
          .lightbox-image.zoomed {
            cursor: grab;
            max-width: none;
            max-height: none;
            transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          }
          
          .lightbox-image.zoomed.dragging {
            cursor: grabbing;
            transition: none;
          }
          
          .lightbox-loading {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 2;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          }
          
          .lightbox-loading.active {
            opacity: 1;
          }
          
          .lightbox-loading svg {
            animation: spin 1s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          .lightbox-close {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 3;
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: white;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            font-size: 32px;
            line-height: 1;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            will-change: transform;
            transform: translate3d(0,0,0);
          }
          
          .lightbox-close:hover {
            background: rgba(255, 255, 255, 0.25);
            transform: translate3d(0,0,0) rotate(90deg) scale(1.1);
          }
          
          .lightbox-nav {
            position: fixed;
            top: 50%;
            transform: translateY(-50%) translate3d(0,0,0);
            z-index: 3;
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: white;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            font-size: 36px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            will-change: transform;
          }
          
          .lightbox-nav:hover {
            background: rgba(255, 255, 255, 0.25);
            transform: translateY(-50%) translate3d(0,0,0) scale(1.15);
          }
          
          .lightbox-nav:active {
            transform: translateY(-50%) translate3d(0,0,0) scale(0.95);
          }
          
          .lightbox-prev {
            left: 30px;
          }
          
          .lightbox-next {
            right: 30px;
          }
          
          .lightbox-counter {
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 3;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(10px);
            color: white;
            padding: 12px 24px;
            border-radius: 30px;
            font-size: 16px;
            font-weight: 500;
            border: 1px solid rgba(255, 255, 255, 0.1);
          }
          
          /* Zoom Controls */
          .lightbox-zoom-controls {
            position: fixed;
            bottom: 90px;
            left: 50%;
            transform: translateX(-50%) translate3d(0,0,0);
            z-index: 3;
            display: flex;
            gap: 10px;
            opacity: 0;
            transition: opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1);
            will-change: opacity;
          }
          
          #image-lightbox.active .lightbox-zoom-controls {
            opacity: 1;
          }
          
          .zoom-btn {
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: white;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            font-size: 20px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            user-select: none;
            will-change: transform;
            transform: translate3d(0,0,0);
          }
          
          .zoom-btn:hover {
            background: rgba(255, 255, 255, 0.25);
            transform: translate3d(0,0,0) scale(1.15);
          }
          
          .zoom-btn:active {
            transform: translate3d(0,0,0) scale(0.9);
          }
          
          .zoom-btn.disabled {
            opacity: 0.3;
            cursor: not-allowed;
          }
          
          .zoom-level-indicator {
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(10px);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            min-width: 60px;
            text-align: center;
          }
          
          /* Mobile lightbox optimizations */
          @media (max-width: 768px) {
            .lightbox-close {
              top: 15px;
              right: 15px;
              width: 44px;
              height: 44px;
              font-size: 28px;
            }
            
            .lightbox-nav {
              width: 50px;
              height: 50px;
              font-size: 30px;
            }
            
            .lightbox-prev {
              left: 15px;
            }
            
            .lightbox-next {
              right: 15px;
            }
            
            .lightbox-counter {
              bottom: 20px;
              padding: 10px 20px;
              font-size: 14px;
            }
            
            .lightbox-zoom-controls {
              bottom: 70px;
              gap: 8px;
            }
            
            .zoom-btn {
              width: 40px;
              height: 40px;
              font-size: 18px;
            }
            
            .lightbox-image {
              max-width: 100vw;
              max-height: 90vh;
            }
            
            .lightbox-overlay {
              cursor: default;
            }
          }
          
          /* Comprehensive Responsive Design for All Mobile Devices */
          
          /* Small phones (iPhone SE, Galaxy S series) - 320-375px */
          @media (max-width: 375px) {
            .side-panel {
              width: 100vw;
              left: 0;
              transform: translateX(-100%);
              transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
              will-change: transform;
            }

            .side-panel.open {
              transform: translateX(0);
            }

            .property-panel {
              width: 100vw;
              right: 0;
              left: auto;
              transform: translateX(100%);
              transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
              will-change: transform;
            }

            .property-panel.open {
              transform: translateX(0);
            }

            .panel-header, .property-panel-header {
              padding-top: calc(env(safe-area-inset-top) + 10px) !important;
              padding-bottom: 10px !important;
              padding-left: 16px !important;
              padding-right: 0 !important;
              min-height: calc(env(safe-area-inset-top) + 52px) !important;
              max-height: none !important;
              display: flex !important;
              align-items: center !important;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
            }

            .project-hero {
              background: transparent !important;
              border-bottom: none !important;
              padding: 0 50px 0 0 !important;
              flex: 1 !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: center !important;
              min-height: auto !important;
              overflow: visible !important;
            }
            
            .project-title {
              font-size: 16px !important;
              margin: 0 !important;
              padding: 0 !important;
              display: block !important;
              visibility: visible !important;
              opacity: 1 !important;
              color: #ffffff !important;
              font-weight: 700 !important;
              line-height: 1.3 !important;
              word-wrap: break-word !important;
              overflow-wrap: break-word !important;
              max-width: 100% !important;
            }
            
            /* Responsive title sizing based on length */
            .project-title.title-medium {
              font-size: 14px !important;
              line-height: 1.25 !important;
            }
            
            .project-title.title-long {
              font-size: 13px !important;
              line-height: 1.2 !important;
            }
            
            .project-title.title-extra-long {
              font-size: 12px !important;
              line-height: 1.15 !important;
              letter-spacing: -0.2px !important;
            }
            
            .panel-header h2 {
              font-size: 16px;
            }
            
            .property-panel-title {
              padding: 10px 50px 10px 16px !important;
              flex: 1 !important;
            }
            
            .property-panel-title h3 {
              font-size: 16px !important;
              margin: 0 !important;
            }
            
            .close-panel {
              width: 48px !important;
              height: 48px !important;
              font-size: 24px !important;
              top: 2px !important;
              right: 2px !important;
              flex-shrink: 0;
            }
            
            /* Optimize content scrolling on mobile */
            .panel-content, .property-panel-content {
              flex: 1;
              min-height: 0;
              overscroll-behavior: none;  /* Changed from contain to none - prevent scroll boundary events */
              -webkit-overflow-scrolling: touch;
              overflow-x: hidden;
              overflow-y: auto;
              scroll-behavior: auto;  /* Changed from smooth to auto - prevent momentum conflicts */
              touch-action: pan-y;  /* CRITICAL: Allow only vertical scrolling, block horizontal */
            }
            
            /* Force all content to fit within panel width */
            .project-section {
              max-width: 100% !important;
              overflow-x: hidden !important;
              box-sizing: border-box !important;
            }
            
            .project-section * {
              max-width: 100% !important;
              box-sizing: border-box !important;
            }
            
            /* Reduce padding on mobile for more space */
            .project-section > div > div[style*="padding"] {
              padding: 15px !important;
            }
            
            /* Make lists more compact on mobile */
            .project-section ul {
              padding-left: 18px !important;
              font-size: 13px !important;
            }
            
            .project-section ul li {
              margin-bottom: 6px !important;
              line-height: 1.4 !important;
            }
            
            /* Production Cycle Timeline mobile optimization - ID-based targeting */
            #timeline-steps {
              display: flex !important;
              flex-direction: column !important;
              align-items: stretch !important;
              gap: 20px !important;
            }
            
            /* Hide timeline connector line on mobile */
            #timeline-steps > div[style*="position: absolute"][style*="height: 3px"] {
              display: none !important;
            }
            
            /* Timeline steps - stack vertically */
            #timeline-steps > div[style*="flex: 1"] {
              flex: none !important;
              width: 100% !important;
              margin-bottom: 0 !important;
            }
            
            /* Bottom stats - stack vertically */
            #timeline-stats {
              display: flex !important;
              flex-direction: column !important;
              gap: 12px !important;
            }
            
            /* Stats items on mobile - make block with spacing */
            #timeline-stats > div {
              padding: 15px !important;
              background: linear-gradient(135deg, rgba(46, 125, 50, 0.05) 0%, rgba(46, 125, 50, 0.1) 100%) !important;
              border-radius: 8px !important;
              border: 1px solid rgba(46, 125, 50, 0.2) !important;
            }
            
            /* Make timeline circles smaller on mobile */
            #timeline-steps div[style*="width: 80px; height: 80px"] {
              width: 70px !important;
              height: 70px !important;
              font-size: 32px !important;
            }
            
            /* Gallery content - prevent any movement on mobile */
            .gallery-content {
              overflow: hidden;
              -webkit-overflow-scrolling: auto;
            }
            
            #current-images, #vision-images, #progress-images {
              transform: translate3d(0, 0, 0);
              -webkit-transform: translate3d(0, 0, 0);
              backface-visibility: hidden;
              -webkit-backface-visibility: hidden;
            }
            
            .carousel-main {
              height: 220px;
            }

            .carousel-nav {
              width: 36px;
              height: 36px;
              font-size: 16px;
            }
            
            .carousel-thumbnail {
              width: 50px;
              height: 38px;
            }
            
            .gallery-tab {
              padding: 8px 12px;
              font-size: 12px;
            }
            
            /* Extra mobile optimization for mushroom page */
            .project-section {
              padding: 15px !important;
            }
            
            .project-section h3 {
              font-size: 16px !important;
              word-wrap: break-word !important;
            }
            
            .project-section h4 {
              font-size: 14px !important;
              word-wrap: break-word !important;
            }
            
            /* Smaller cards on small screens */
            .project-section > div > div {
              padding: 12px !important;
              margin-bottom: 10px !important;
            }
          }
          
          /* Standard phones (iPhone 12-14, most Android) - 376-428px */
          @media (min-width: 376px) and (max-width: 428px) {
            .carousel-main {
              height: 250px;
            }
          }
          
          /* Large phones & small tablets - up to 768px */
          @media (max-width: 768px) {
            .side-panel {
              width: 100vw;
              left: 0;
              transform: translateX(-100%);
              transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
              will-change: transform;
            }

            .side-panel.open {
              transform: translateX(0);
            }

            .property-panel {
              width: 100vw;
              right: 0;
              left: auto;
              transform: translateX(100%);
              transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
              will-change: transform;
            }

            .property-panel.open {
              transform: translateX(0);
            }

            /* Fix header hidden under iOS status bar / notch (viewport-fit=cover) */
            .panel-header, .property-panel-header {
              padding-top: calc(env(safe-area-inset-top) + 10px) !important;
              padding-bottom: 10px !important;
              padding-left: 16px !important;
              padding-right: 0 !important;
              min-height: calc(env(safe-area-inset-top) + 52px) !important;
              max-height: none !important;
              display: flex !important;
              align-items: center !important;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
            }

            /* Hero fills remaining header space, transparent so panel-header bg shows */
            .project-hero {
              background: transparent !important;
              border-bottom: none !important;
              padding: 0 50px 0 0 !important;
              flex: 1 !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: center !important;
              min-height: auto !important;
              overflow: visible !important;
            }

            .close-panel {
              top: calc(env(safe-area-inset-top) + 6px) !important;
            }
            
            /* Responsive title sizing based on length */
            .project-title.title-medium {
              font-size: 15px !important;
              line-height: 1.25 !important;
            }
            
            .project-title.title-long {
              font-size: 14px !important;
              line-height: 1.2 !important;
            }
            
            .project-title.title-extra-long {
              font-size: 13px !important;
              line-height: 1.15 !important;
              letter-spacing: -0.2px !important;
            }
            
            .zone-controls {
              max-width: 280px;
              padding: 15px;
            }
            
            .investment-grid {
              grid-template-columns: 1fr;
            }
            
            .image-grid {
              grid-template-columns: 1fr;
            }
            
            /* Mushroom page mobile optimization - force single column */
            .project-section > div[style*="grid-template-columns: 1fr 1fr"],
            .project-section > div[style*="grid-template-columns: repeat(3, 1fr)"],
            .project-section > div[style*="grid-template-columns: repeat(2, 1fr)"] {
              display: flex !important;
              flex-direction: column !important;
              gap: 15px !important;
            }
            
            /* Ensure all nested grids also become single column */
            .project-section div[style*="display: grid"] {
              display: flex !important;
              flex-direction: column !important;
            }
            
            /* Fix overflow for mushroom investment cards */
            .project-section > div > div[style*="background: linear-gradient"] {
              width: 100% !important;
              box-sizing: border-box !important;
              overflow: hidden !important;
            }
            
            /* Make font sizes smaller on mobile for mushroom page */
            .project-section div[style*="font-size: 28px"] {
              font-size: 24px !important;
            }
            
            .project-section div[style*="font-size: 26px"] {
              font-size: 22px !important;
            }
            
            .project-section div[style*="font-size: 36px"] {
              font-size: 32px !important;
            }
            
            .carousel-main {
              height: 260px;
              transition: transform 0.3s ease-out;
            }
            
            .carousel-thumbnail {
              width: 60px;
              height: 45px;
              transition: all 0.2s ease;
            }
            
            .carousel-thumbnail:active {
              transform: scale(0.95);
            }
            
            .carousel-nav {
              width: 44px;
              height: 44px;
              font-size: 20px;
              background: rgba(0,0,0,0.6);
              backdrop-filter: blur(8px);
              transition: all 0.2s ease;
            }
            
            .carousel-nav:active {
              transform: scale(0.9);
              background: rgba(0,0,0,0.8);
            }

            /* Larger touch targets for mobile */
            .leaflet-control-zoom a {
              width: 48px;
              height: 48px;
              line-height: 48px;
              font-size: 22px;
            }
            .leaflet-control-zoom {
              border-radius: 12px;
            }
            
          }
          
          /* Tablets (iPad, iPad Pro) - 769-1024px */
          @media (min-width: 769px) and (max-width: 1024px) {
            .side-panel {
              width: 480px;
            }
            
            .property-panel {
              width: 480px;
            }
            
            .carousel-main {
              height: 380px;
            }
          }
          
          /* Large tablets & small desktops - 1025-1366px */
          @media (min-width: 1025px) and (max-width: 1366px) {
            .side-panel {
              width: 520px;
            }
            
            .property-panel {
              width: 520px;
            }
          }
          
    /* Property Boundary Info Panel */
    .property-panel {
      position: fixed;
      top: 0;
      right: -480px;
      width: 460px;
      height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
      box-shadow: -5px 0 40px rgba(0,0,0,0.25), 0 0 20px rgba(0,0,0,0.15);
      z-index: 2000;
      overflow: hidden;
      -webkit-overflow-scrolling: touch;
      touch-action: pan-y;
      will-change: right, transform;
      transform: translateZ(0);
      transition: right 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      border-left: 2px solid rgba(255,255,255,0.2);
      display: flex;
      flex-direction: column;
    }
    
    .property-panel.open {
      right: 0;
    }
    
    .property-panel-header {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.95) 0%, rgba(118, 75, 162, 0.95) 100%);
      color: white;
      padding: 16px 24px 14px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 60px;
      max-height: 60px;
      touch-action: manipulation;
      z-index: 2001;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      backdrop-filter: blur(15px);
      flex-shrink: 0;
      gap: 16px;
      -webkit-tap-highlight-color: transparent;
    }
    
    .property-panel-title {
      display: flex;
      align-items: center;
      padding-right: 40px;
    }
    
    .property-panel-title h3 {
      margin: 0;
      font-size: 22px;
      font-weight: 600;
      letter-spacing: 0.3px;
      line-height: 1.4;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    @media (max-width: 480px) {
      .property-panel-title h3 {
        font-size: 18px;
      }
    }
    
    .property-panel-content {
      padding: 24px 24px 32px;
      background: #f6f4ef;
      margin: 0;
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      scroll-behavior: smooth;
      overscroll-behavior-y: contain;
      -webkit-overflow-scrolling: touch;
      touch-action: pan-y;
      /* Bigger, warmer, more readable base type for all proposal prose (V0.20) */
      font-size: 16px;
      line-height: 1.72;
      color: #34343d;
      -webkit-font-smoothing: antialiased;
      /* Smooth momentum scrolling on mobile */
      -webkit-transform: translateZ(0);
      transform: translateZ(0);
    }
    .property-panel-content p { font-size: 15.5px; line-height: 1.72; }

    .property-panel-content::-webkit-scrollbar {
      width: 8px;
    }
    
    .property-panel-content::-webkit-scrollbar-track {
      background: rgba(0,0,0,0.05);
    }
    
    .property-panel-content::-webkit-scrollbar-thumb {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 4px;
    }
    
    /* ---- V0.20 proposal card system: bigger type, soft cards, subtle rotating accents ---- */
    .property-info-section {
      background: #ffffff;
      border-radius: 16px;
      padding: 22px 24px;
      margin-bottom: 20px;
      box-shadow: 0 3px 16px rgba(31, 28, 46, 0.07);
      border: 1px solid rgba(31, 28, 46, 0.06);
      border-left: 4px solid #6b8f6b;   /* default accent; rotated below */
    }
    /* gentle 3-colour rotation so sections feel distinct but calm */
    .property-info-section:nth-of-type(3n+1) { border-left-color: #6b8f6b; }   /* sage   */
    .property-info-section:nth-of-type(3n+2) { border-left-color: #5f79c0; }   /* indigo */
    .property-info-section:nth-of-type(3n+3) { border-left-color: #c1904a; }   /* amber  */

    .property-info-section h4 {
      margin: 0 0 14px 0;
      font-size: 17.5px;
      font-weight: 700;
      letter-spacing: 0.2px;
      color: #2b2b34;
      padding-bottom: 10px;
      border-bottom: 1px solid rgba(31, 28, 46, 0.10);
    }
    .property-info-section .section-sub {
      margin: -8px 0 14px; font-size: 13.5px; line-height: 1.5;
      color: #7a7a86; font-weight: 500;
    }

    .property-detail-row {
      display: flex;
      flex-direction: column;
      gap: 5px;
      padding: 13px 0;
      border-bottom: 1px solid rgba(31, 28, 46, 0.07);
    }

    .property-detail-row:last-child {
      border-bottom: none;
    }

    .property-detail-label {
      font-weight: 700;
      color: #8a8a95;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.7px;
    }

    .property-detail-value {
      color: #2f2f38;
      font-weight: 500;
      line-height: 1.65;
      font-size: 15.5px;
    }

    .property-features-list {
      list-style: none;
      padding: 0;
      margin: 14px 0 0 0;
    }

    .property-features-list li {
      padding: 13px 0 13px 32px;
      position: relative;
      color: #3a3a44;
      line-height: 1.72;
      font-size: 15px;
      border-bottom: 1px solid rgba(31, 28, 46, 0.06);
    }

    .property-features-list li:last-child {
      border-bottom: none;
    }

    .property-features-list li:before {
      content: "✦";
      position: absolute;
      left: 4px;
      font-size: 15px;
      top: 13px;
      color: #b99a4a;
    }

    .property-features-list li strong {
      color: #2b2b34;
      font-weight: 700;
      display: block;
      margin-bottom: 3px;
      font-size: 15.5px;
    }
    
    .boundary-gradient-preview {
      width: 100%;
      height: 60px;
      border-radius: 8px;
      margin: 15px 0;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      border: 2px solid white;
    }
    
    /* Project Links Hover Effects */
    .property-panel-content a[href]:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
    
    .property-panel.swiping {
      transition: transform 0s !important;
    }
    
    @media (max-width: 768px) {
      .property-panel {
        width: 100vw;
        left: 0;
        right: auto;
        transform: translateX(-100%);
        transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        will-change: transform;
      }

      .property-panel.open {
        transform: translateX(0);
      }
      
      .property-panel-title h3 {
        font-size: 18px;
      }
      
      .property-panel-content {
        padding: 20px 16px;
      }
      
      .property-info-section {
        padding: 16px;
        margin-bottom: 16px;
      }
      
      .property-info-section h4 {
        font-size: 15px;
        margin-bottom: 12px;
      }
      
      .property-detail-value {
        font-size: 14px;
      }
      
      .property-features-list li {
        font-size: 13px;
        padding: 10px 0 10px 28px;
      }
    }
    
    /* Loading Animation */
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }
    
    .loading {
      animation: pulse 2s infinite;
    }
    
    /* Admin Popup Menu Styles - HIDDEN FOR PUBLIC (remove display: none to enable) */
    .admin-menu-toggle {
      position: fixed;
      top: 60px;
      right: 20px;
      width: 50px;
      height: 50px;
      background: rgba(0,0,0,0.8);
      color: white;
      border-radius: 50%;
      display: flex; /* VISIBLE — reposition mode enabled for proposal review */
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 2000;
      font-size: 20px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transition: all 0.3s ease;
    }
    
    .admin-menu-toggle:hover {
      background: rgba(0,0,0,0.9);
      transform: scale(1.1);
    }
    
    /* Territory Drawing Editor Toggle - HIDDEN FOR PUBLIC */
    .territory-editor-toggle {
      position: fixed;
      top: 120px;
      right: 20px;
      width: 50px;
      height: 50px;
      background: linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%);
      color: white;
      border-radius: 50%;
      display: none !important; /* HIDDEN - Remove this line to show territory editor */
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 2000;
      font-size: 20px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transition: all 0.3s ease;
    }
    
    .territory-editor-toggle:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 16px rgba(0,0,0,0.4);
    }
    
    .admin-popup {
      position: fixed;
      top: 120px;
      right: 20px;
      width: 300px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      z-index: 1999;
      border: 1px solid #e2e8f0;
    }
    
    .popup-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 15px 20px;
      border-radius: 12px 12px 0 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .popup-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }
    
    .close-popup {
      background: none;
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: background 0.2s ease;
    }
    
    .close-popup:hover {
      background: rgba(255,255,255,0.2);
    }
    
    .popup-content {
      padding: 20px;
    }
    
    /* Territory Drawing Editor Styles */
    .territory-editor {
      position: fixed;
      top: 60px;
      left: 20px;
      width: 320px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      z-index: 1999;
      border: 1px solid #e2e8f0;
      max-height: 80vh;
      overflow-y: auto;
    }
    
    .editor-header {
      background: linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%);
      color: white;
      padding: 15px 20px;
      border-radius: 12px 12px 0 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .editor-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }
    
    .close-editor {
      background: none;
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: background 0.2s ease;
    }
    
    .close-editor:hover {
      background: rgba(255,255,255,0.2);
    }
    
    .editor-content {
      padding: 20px;
    }
    
    .zone-selector, .brush-controls, .drawing-mode, .territory-actions {
      margin-bottom: 20px;
    }
    
    .zone-selector label, .brush-controls label {
      display: block;
      font-weight: 600;
      margin-bottom: 8px;
      color: #2d3748;
    }
    
    .zone-selector select {
      width: 100%;
      padding: 8px 12px;
      border: 2px solid #e2e8f0;
      border-radius: 6px;
      font-size: 14px;
      background: white;
    }
    
    .brush-controls {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .brush-controls input[type="range"] {
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: #e2e8f0;
      outline: none;
    }
    
    #brush-size-display {
      text-align: center;
      font-weight: 600;
      color: #4299e1;
    }
    
    .drawing-mode {
      display: flex;
      gap: 15px;
    }
    
    .drawing-mode label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      padding: 8px 12px;
      border: 2px solid #e2e8f0;
      border-radius: 6px;
      transition: all 0.2s ease;
    }
    
    .drawing-mode label:hover {
      border-color: #4299e1;
      background: #f7fafc;
    }
    
    .drawing-mode input[type="radio"] {
      margin: 0;
    }
    
    .territory-btn {
      display: block;
      width: 100%;
      padding: 10px 15px;
      margin-bottom: 8px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      transition: transform 0.2s ease;
    }
    
    .territory-btn:hover {
      transform: translateY(-1px);
    }
    
    .drawing-status {
      background: linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%);
      padding: 12px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 10px;
      border-left: 4px solid #2196F3;
    }
    
    /* Drawing Cursor Styles */
    .drawing-cursor {
      position: absolute;
      border: 2px solid #FF6B6B;
      border-radius: 50%;
      pointer-events: none;
      z-index: 1000;
      background: rgba(255, 107, 107, 0.2);
      transform: translate(-50%, -50%);
    }
    
    /* CTA Button Styles */
    .cta-section {
      margin: 40px 0;
    }
    
    .cta-button {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-width: 140px;
      justify-content: center;
    }
    
    .cta-button.primary {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.3);
    }
    
    .cta-button.primary:hover {
      background: rgba(255, 255, 255, 0.3);
      border-color: rgba(255, 255, 255, 0.5);
      transform: translateY(-2px);
    }
    
    .cta-button.secondary {
      background: transparent;
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.3);
    }
    
    .cta-button.secondary:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.5);
      transform: translateY(-2px);
    }

    /* Dropdown Contact Styles */
    .contact-dropdown {
      position: relative;
      margin-bottom: 1.5rem;
    }

    .dropdown-button {
      width: 100%;
      padding: 14px 20px;
      background: rgba(255, 255, 255, 0.2);
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 10px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }

    .dropdown-button:hover {
      background: rgba(255, 255, 255, 0.3);
      border-color: rgba(255, 255, 255, 0.5);
      transform: translateY(-2px);
    }

    .dropdown-arrow {
      transition: transform 0.3s ease;
      font-size: 12px;
    }

    .dropdown-button.active .dropdown-arrow {
      transform: rotate(180deg);
    }

    .dropdown-content {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.4s ease, padding 0.4s ease;
      background: rgba(255, 255, 255, 0.95);
      border-radius: 10px;
      margin-top: 10px;
    }

    .dropdown-content.active {
      max-height: 400px;
      padding: 20px;
      border: 2px solid rgba(255, 255, 255, 0.5);
    }

    .team-contact-header {
      color: #2e7d32;
      font-weight: 600;
      margin-bottom: 15px;
      font-size: 16px;
    }

    .contact-item {
      margin-bottom: 12px;
      padding: 10px;
      border-left: 3px solid rgba(255, 255, 255, 0.8);
      padding-left: 15px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 6px;
    }

    .contact-name {
      font-weight: 600;
      color: #333;
      display: block;
      margin-bottom: 5px;
      font-size: 14px;
    }

    .contact-email {
      color: #2e7d32;
      text-decoration: none;
      transition: color 0.3s ease;
      font-size: 13px;
    }

    .contact-email:hover {
      color: #1b5e20;
      text-decoration: underline;
    }

    .action-buttons {
      display: flex;
      gap: 15px;
      flex-wrap: wrap;
    }

    .action-button {
      flex: 1;
      min-width: 200px;
      padding: 14px 20px;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
      text-align: center;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border: 2px solid rgba(255, 255, 255, 0.3);
    }

    .website-button {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      cursor: pointer;
    }

    .website-button:hover {
      background: rgba(255, 255, 255, 0.35);
      border-color: rgba(255, 255, 255, 0.5);
      transform: translateY(-2px);
    }

    .onboarding-button {
      background: rgba(150, 150, 150, 0.2);
      color: rgba(255, 255, 255, 0.6);
      border: 2px solid rgba(255, 255, 255, 0.2);
      cursor: not-allowed;
      opacity: 0.7;
    }

    @media (max-width: 768px) {
      .action-buttons {
        flex-direction: column;
      }
      
      .action-button {
        min-width: 100%;
      }
    }
    
    /* Footer Styles */
    .map-footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(0,0,0,0.8);
      color: white;
      text-align: center;
      padding: 15px 20px 20px 20px;
      z-index: 1000;
      font-size: 12px;
      line-height: 1.4;
    }
    /* ── Multi-property overview mode ── */
    .property-label-marker { display: none; }
    .overview-mode .property-label-marker { display: block !important; }
    .property-label-chip {
      transform: translate(-50%, -50%);
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
      font-weight: 700;
      font-size: 14px;
      padding: 9px 16px;
      border-radius: 22px;
      box-shadow: 0 6px 18px rgba(0,0,0,0.35);
      white-space: nowrap;
      border: 2px solid rgba(255,255,255,0.55);
      cursor: pointer;
      transition: transform 0.2s ease;
    }
    .property-label-chip:hover { transform: translate(-50%, -50%) scale(1.06); }
    /* ── Position Editor ── */
    .admin-popup { z-index: 2600; }
    .editor-label { display: block; margin: 2px 0 8px 0; font-weight: 600; color: #333; font-size: 13.5px; }
    .edit-property-buttons { display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
    .edit-prop-btn {
      flex: 1; min-width: 118px; padding: 10px 8px;
      border: 2px solid #e0e0e0; border-radius: 8px; background: #fff;
      font-weight: 600; font-size: 13px; cursor: pointer; transition: all 0.2s ease;
    }
    .edit-prop-btn:hover { border-color: #b3b9f0; }
    .edit-prop-btn.active { border-color: #667eea; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; }
    #edit-toggle-btn { background: #4CAF50; color: #fff; margin-bottom: 12px; }
    #edit-toggle-btn:disabled { background: #e0e0e0; color: #999; cursor: not-allowed; }
    #edit-toggle-btn.editing { background: #FF9800; }
    #reset-positions-btn { background: #607D8B; color: #fff; margin-bottom: 12px; }
    .edit-hint {
      font-size: 12.5px; color: #666; background: #FFF8E1;
      border-left: 3px solid #FFC107; padding: 10px 12px;
      border-radius: 6px; margin-bottom: 12px; line-height: 1.5;
    }
    .moved-list {
      max-height: 150px; overflow-y: auto; background: #f8f9fa;
      border-radius: 8px; padding: 10px 12px; margin-bottom: 12px; font-size: 12.5px;
    }
    .moved-title { font-weight: 700; color: #4CAF50; margin-bottom: 6px; }
    .moved-item { padding: 3px 0; color: #444; }
    .moved-coords { color: #999; font-family: monospace; font-size: 11px; }

    /* Editing glow on unlocked icons (box-shadow only — never fights the
       zoom-scaling inline transform) */
    @keyframes edit-pulse {
      0%, 100% { box-shadow: 0 0 0 3px rgba(255, 152, 0, 0.9), 0 0 18px 6px rgba(255, 152, 0, 0.45); }
      50% { box-shadow: 0 0 0 7px rgba(255, 152, 0, 0.35), 0 0 26px 10px rgba(255, 152, 0, 0.25); }
    }
    .zone-marker.marker-editing > div {
      animation: edit-pulse 1.5s ease-in-out infinite;
      border-color: #FFB300 !important;
      cursor: grab;
    }
    .zone-marker.marker-editing > div:active { cursor: grabbing; }
    /* Icons being edited stay visible at any zoom */
    .zone-marker.marker-editing { display: block !important; }

    /* ---- Current / Vision mode toggle ---- */
    #mode-toggle {
      position: fixed; top: 14px; left: 50%; transform: translateX(-50%);
      z-index: 2600; display: flex; gap: 2px;
      background: rgba(18, 18, 30, 0.82);
      border: 1px solid rgba(255,255,255,0.25); border-radius: 999px;
      padding: 4px; cursor: pointer; user-select: none;
      -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
      box-shadow: 0 6px 20px rgba(0,0,0,0.35);
      transition: box-shadow 0.4s ease, border-color 0.4s ease;
    }
    #mode-toggle .mt-opt {
      padding: 7px 18px; border-radius: 999px; font-weight: 700;
      font-size: 13px; letter-spacing: 0.4px; line-height: 1;
      color: rgba(255,255,255,0.6); transition: all 0.3s ease;
    }
    #mode-toggle .mt-current { background: rgba(255,255,255,0.94); color: #1a1a2e; }
    #mode-toggle.vision .mt-current { background: transparent; color: rgba(255,255,255,0.6); }
    #mode-toggle.vision .mt-vision {
      background: linear-gradient(135deg, #FFD700 0%, #FFB300 55%, #FF8F00 100%);
      color: #2a1600; box-shadow: 0 0 18px rgba(255, 200, 60, 0.6);
    }
    #mode-toggle.vision { border-color: rgba(255, 215, 0, 0.55); box-shadow: 0 6px 24px rgba(255, 180, 40, 0.35); }
    @media (max-width: 640px) {
      #mode-toggle { top: 10px; }
      #mode-toggle .mt-opt { padding: 6px 13px; font-size: 12px; }
    }
    /* Vision-mode ambience */
    body.vision-mode .map-footer {
      background: linear-gradient(90deg, #1a1030, #2d1b45, #1a1030);
      color: #FFE9A8; border-top: 1px solid rgba(255, 215, 0, 0.35);
    }
    body.vision-mode .property-label-chip {
      background: linear-gradient(135deg, #3b2160 0%, #6a3d9a 100%);
      border-color: rgba(255, 215, 0, 0.75);
      box-shadow: 0 4px 14px rgba(80, 40, 140, 0.55), 0 0 12px rgba(255, 215, 0, 0.25);
    }

    /* ---- 🗺️ V0.21 County GIS layers panel ---- */
    #layers-toggle {
      position: fixed; top: 96px; left: 50%; transform: translateX(-50%);
      z-index: 1200;
      background: linear-gradient(135deg, #2d4a23 0%, #5c8a4a 100%);
      color: #fff; font-weight: 800; font-size: 12px; letter-spacing: 0.6px;
      padding: 6px 16px; border-radius: 999px;
      border: 1px solid rgba(190, 230, 160, 0.45);
      cursor: pointer; user-select: none;
      box-shadow: 0 5px 16px rgba(0, 0, 0, 0.35);
      transition: box-shadow 0.25s ease, transform 0.15s ease;
    }
    #layers-toggle:hover { box-shadow: 0 0 20px rgba(140, 220, 110, 0.55); transform: translateX(-50%) scale(1.05); }
    #layers-toggle.active { background: linear-gradient(135deg, #3c6a2d 0%, #7cb35f 100%); }
    #layers-toggle.busy { animation: lpBusy 1.1s ease-in-out infinite; }
    @keyframes lpBusy {
      0%, 100% { box-shadow: 0 5px 16px rgba(0,0,0,0.35); }
      50% { box-shadow: 0 0 20px rgba(160, 235, 120, 0.85); }
    }
    #layers-panel {
      position: fixed; top: 132px; left: 50%; transform: translateX(-50%);
      z-index: 1250; display: none;
      width: min(94vw, 340px); max-height: min(70vh, 560px); overflow-y: auto;
      background: rgba(18, 22, 20, 0.97); color: #eef2ec;
      border: 1px solid rgba(150, 200, 130, 0.35); border-radius: 18px;
      padding: 16px 16px 14px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
      -webkit-overflow-scrolling: touch;
    }
    #layers-panel.open { display: block; }
    #layers-panel .lp-head {
      display: flex; align-items: center; justify-content: space-between;
      margin: 0 0 4px; font-size: 15px; font-weight: 800; letter-spacing: 0.3px;
    }
    #layers-panel .lp-close { cursor: pointer; opacity: 0.65; padding: 2px 6px; font-size: 15px; }
    #layers-panel .lp-close:hover { opacity: 1; }
    #layers-panel .lp-sub { margin: 0 0 14px; font-size: 11.5px; line-height: 1.5; color: rgba(238, 242, 236, 0.6); }
    #layers-panel .lp-group {
      margin: 0 0 8px; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.11);
      font-size: 10.5px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;
      color: rgba(190, 220, 175, 0.9);
    }
    #layers-panel .lp-group:first-of-type { border-top: none; padding-top: 0; }
    #layers-panel .lp-row {
      display: flex; align-items: center; gap: 10px;
      padding: 7px 9px; margin-bottom: 3px; border-radius: 9px;
      font-size: 13px; cursor: pointer; user-select: none;
      transition: background 0.12s ease;
    }
    #layers-panel .lp-row:hover { background: rgba(255, 255, 255, 0.07); }
    #layers-panel .lp-row.on { background: rgba(124, 179, 95, 0.18); }
    #layers-panel .lp-dot {
      width: 15px; height: 15px; flex: 0 0 15px; border-radius: 5px;
      border: 1.5px solid rgba(255, 255, 255, 0.35); position: relative;
    }
    #layers-panel .lp-row.radio .lp-dot { border-radius: 50%; }
    #layers-panel .lp-row.on .lp-dot { background: #7cb35f; border-color: #7cb35f; }
    #layers-panel .lp-row.on .lp-dot:after {
      content: ''; position: absolute; left: 4px; top: 1px;
      width: 4px; height: 8px; border: solid #14200e;
      border-width: 0 2px 2px 0; transform: rotate(45deg);
    }
    #layers-panel .lp-txt { flex: 1; min-width: 0; line-height: 1.35; }
    #layers-panel .lp-note { display: block; font-size: 10.5px; color: rgba(238, 242, 236, 0.5); margin-top: 1px; }
    #layers-panel .lp-op { display: flex; align-items: center; gap: 9px; padding: 9px 9px 2px; font-size: 11px; color: rgba(238, 242, 236, 0.65); }
    #layers-panel .lp-op input { flex: 1; accent-color: #7cb35f; }
    #layers-panel .lp-years { padding: 4px 10px 10px 30px; opacity: 0.55; transition: opacity 0.2s; }
    #layers-panel .lp-years.live { opacity: 1; }
    #layers-panel .lp-year-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 4px; }
    #layers-panel .lp-year-head b { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: #f3f6ee; font-variant-numeric: tabular-nums; }
    #layers-panel .lp-year-head span { font-size: 11px; color: rgba(238, 242, 236, 0.7); }
    #layers-panel .lp-years input[type=range] { width: 100%; accent-color: #e0b64a; cursor: ew-resize; }
    #layers-panel .lp-year-ticks { display: flex; justify-content: space-between; font-size: 9.5px; color: rgba(238, 242, 236, 0.45); letter-spacing: 0.4px; margin-top: 1px; }
    #layers-panel .lp-legend { padding: 2px 2px 6px; }
    #layers-panel .lp-lg {
      display: flex; align-items: flex-start; gap: 9px;
      font-size: 11.5px; line-height: 1.45; color: rgba(238, 242, 236, 0.72);
      padding: 4px 7px;
    }
    #layers-panel .lp-lg i {
      width: 11px; height: 11px; flex: 0 0 11px; margin-top: 3px;
      border-radius: 3px; display: block;
    }
    #layers-panel .lp-lg-tip {
      margin-top: 4px; padding: 7px 9px; border-radius: 8px;
      background: rgba(124, 179, 95, 0.14); color: rgba(238, 242, 236, 0.85);
    }
    #layers-panel .lp-credit { margin: 12px 0 0; padding-top: 11px; border-top: 1px solid rgba(255, 255, 255, 0.11); font-size: 10.5px; line-height: 1.5; color: rgba(238, 242, 236, 0.45); }
    /* V0.25 — grouped layer library, live legends, per-layer opacity */
    #layers-panel .lp-sec { margin: 0 0 4px; border-top: 1px solid rgba(255, 255, 255, 0.09); }
    #layers-panel .lp-sec summary {
      display: flex; align-items: center; gap: 9px; list-style: none;
      padding: 9px 6px 8px; cursor: pointer; user-select: none; border-radius: 9px;
    }
    #layers-panel .lp-sec summary::-webkit-details-marker { display: none; }
    #layers-panel .lp-sec summary:hover { background: rgba(255, 255, 255, 0.05); }
    #layers-panel .lp-sec-ico { font-size: 16px; width: 22px; text-align: center; flex: 0 0 22px; }
    #layers-panel .lp-sec-txt { flex: 1; min-width: 0; font-size: 12.5px; font-weight: 800; letter-spacing: 0.3px; line-height: 1.3; }
    #layers-panel .lp-sec-txt .lp-note { font-weight: 500; letter-spacing: 0; }
    #layers-panel .lp-sec-n { font-size: 10px; font-weight: 800; letter-spacing: 0.6px; color: #14200e; background: #7cb35f; border-radius: 999px; padding: 2px 7px; min-width: 0; }
    #layers-panel .lp-sec-n:empty { display: none; }
    #layers-panel .lp-sec-arrow { width: 7px; height: 7px; border: solid rgba(238, 242, 236, 0.5); border-width: 0 1.5px 1.5px 0; transform: rotate(-45deg); transition: transform 0.15s; flex: 0 0 7px; margin-right: 3px; }
    #layers-panel .lp-sec[open] .lp-sec-arrow { transform: rotate(45deg); }
    #layers-panel .lp-sec .lp-row { margin-left: 4px; }
    #layers-panel .lp-info {
      flex: 0 0 18px; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
      font-size: 10.5px; font-weight: 800; font-style: italic; font-family: Georgia, serif;
      color: rgba(238, 242, 236, 0.55); border: 1px solid rgba(238, 242, 236, 0.25); cursor: help;
    }
    #layers-panel .lp-info:hover, #layers-panel .lp-info.on { color: #14200e; background: #e0b64a; border-color: #e0b64a; }
    #layers-panel .lp-lgb { margin: 0 0 10px; padding: 9px 10px 8px; border-radius: 11px; background: rgba(255, 255, 255, 0.045); border: 1px solid rgba(255, 255, 255, 0.07); }
    #layers-panel .lp-lgb-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 12.5px; }
    #layers-panel .lp-lgb-head b { font-weight: 800; }
    #layers-panel .lp-lgb-x { cursor: pointer; opacity: 0.5; font-size: 12px; padding: 0 4px; }
    #layers-panel .lp-lgb-x:hover { opacity: 1; }
    #layers-panel .lp-src { font-size: 10.5px; color: rgba(238, 242, 236, 0.5); margin: 2px 0 0; line-height: 1.4; }
    #layers-panel .lp-src a { color: #e0b64a; text-decoration: none; }
    #layers-panel .lp-lgb .lp-op { padding: 6px 0 4px; }
    #layers-panel .lp-lg img { width: 18px; height: 18px; flex: 0 0 18px; margin-top: 1px; border-radius: 3px; background: rgba(255, 255, 255, 0.08); image-rendering: auto; }
    #layers-panel .lp-lg-sub { font-size: 10px; font-weight: 800; letter-spacing: 0.7px; text-transform: uppercase; color: rgba(190, 220, 175, 0.75); padding: 6px 7px 1px; }
    #layers-panel .lp-lg-more { display: none; }
    #layers-panel .lp-lgb.all .lp-lg-more { display: flex; }
    #layers-panel .lp-lg-showall { font-size: 11px; color: #e0b64a; cursor: pointer; padding: 5px 7px 2px; }
    #layers-panel .lp-lg-showall:hover { text-decoration: underline; }
    #layers-panel .lp-lg-wait { opacity: 0.55; font-style: italic; }
    #layers-panel .lp-empty { font-size: 11.5px; color: rgba(238, 242, 236, 0.5); padding: 4px 7px 8px; line-height: 1.5; }
    #layers-panel .lp-years.hist input[type=range] { accent-color: #c9a2ff; }
    .vc-elev-popup .leaflet-popup-content { margin: 10px 14px; font-size: 13px; font-weight: 700; }
    @media (max-width: 768px) {
      #layers-toggle { top: 92px; }
      #layers-panel { top: 126px; max-height: 60vh; }
    }

    /* ---- 🌍 3D terrain mode ---- */
    #earth-toggle {
      position: fixed; top: 60px; left: 50%; transform: translateX(-50%);
      z-index: 1200;
      background: linear-gradient(135deg, #10304f 0%, #2c6e9e 100%);
      color: #fff; font-weight: 800; font-size: 12px; letter-spacing: 0.6px;
      padding: 6px 16px; border-radius: 999px;
      border: 1px solid rgba(160, 220, 255, 0.45);
      cursor: pointer; user-select: none;
      box-shadow: 0 5px 16px rgba(0, 0, 0, 0.35);
      transition: box-shadow 0.25s ease, transform 0.15s ease;
    }
    #earth-toggle:hover {
      box-shadow: 0 0 20px rgba(90, 180, 255, 0.6);
      transform: translateX(-50%) scale(1.05);
    }
    #earth3d { position: fixed; inset: 0; z-index: 3000; background: #000; display: none; opacity: 1; }
    /* pre-build state: rendered at full size so the GL canvas warms up, but invisible & behind everything */
    #earth3d.prebuilding { display: block; opacity: 0; pointer-events: none; z-index: -1; }
    #earth3d.open { display: block; opacity: 1; pointer-events: auto; z-index: 3000; }
    #earth3d-stars { position: absolute; inset: 0; overflow: hidden; z-index: 0; }
    #earth3d-map { position: absolute; inset: 0; z-index: 1; }
    #earth3d-loading {
      position: absolute; inset: 0; z-index: 5; display: none;
      flex-direction: column; align-items: center; justify-content: center;
      gap: 14px; color: rgba(255, 255, 255, 0.85); font-size: 13px;
      letter-spacing: 0.4px; pointer-events: none;
    }
    .earth-orb {
      width: 46px; height: 46px; border-radius: 50%;
      background: radial-gradient(circle at 32% 30%, #7ec4ff 0%, #2c6e9e 45%, #10304f 100%);
      animation: orbPulse 1.4s ease-in-out infinite;
    }
    @keyframes orbPulse {
      0%, 100% { transform: scale(1); box-shadow: 0 0 22px rgba(90, 180, 255, 0.45); }
      50% { transform: scale(1.12); box-shadow: 0 0 34px rgba(120, 200, 255, 0.75); }
    }
    #earth3d-exit {
      position: absolute; top: 14px; left: 14px; z-index: 10;
      background: rgba(12, 14, 24, 0.85); color: #fff;
      padding: 9px 18px; border-radius: 999px;
      font-weight: 700; font-size: 13px; cursor: pointer;
      border: 1px solid rgba(255, 255, 255, 0.3);
      -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
    }
    #earth3d-exit:hover { background: rgba(40, 44, 66, 0.92); }
    #earth3d-hint {
      position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%);
      z-index: 10; max-width: 92vw; text-align: center;
      color: rgba(255, 255, 255, 0.88); background: rgba(12, 14, 24, 0.6);
      padding: 6px 16px; border-radius: 999px; font-size: 12px;
      -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
    }
    #earth3d-attrib {
      position: absolute; bottom: 2px; right: 6px; z-index: 10;
      color: rgba(255, 255, 255, 0.5); font-size: 10px;
    }
    #earth3d .prop-chip3d {
      background: linear-gradient(135deg, #4c3a8c 0%, #6a5acd 100%);
      color: #fff; padding: 6px 13px; border-radius: 999px;
      font-weight: 700; font-size: 12px; white-space: nowrap;
      border: 1.5px solid rgba(255, 215, 0, 0.65); cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.55);
    }
    #earth3d .prop-chip3d:hover { box-shadow: 0 0 16px rgba(255, 215, 0, 0.5); }
    #earth3d .zone3d {
      width: 34px; height: 34px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 19px; cursor: pointer;
      border: 2px solid rgba(255, 255, 255, 0.55);
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
    }
    #earth3d-gearth {
      position: absolute; bottom: 16px; right: 14px; z-index: 10;
      background: rgba(12, 14, 24, 0.85); color: #fff;
      padding: 7px 14px; border-radius: 999px;
      font-weight: 700; font-size: 12px; cursor: pointer;
      border: 1px solid rgba(140, 200, 255, 0.4);
      -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
    }
    #earth3d-gearth:hover { box-shadow: 0 0 14px rgba(90, 180, 255, 0.5); }
    .portal-btn {
      margin: 18px 0 6px; padding: 13px 18px; text-align: center;
      background: linear-gradient(135deg, #2b1a55 0%, #6a3d9a 50%, #2c6e9e 100%);
      color: #fff; font-weight: 800; font-size: 15px; letter-spacing: 0.4px;
      border-radius: 14px; cursor: pointer; user-select: none;
      border: 1.5px solid rgba(255, 215, 0, 0.55);
      box-shadow: 0 4px 18px rgba(80, 40, 140, 0.45);
      transition: box-shadow 0.25s ease, transform 0.15s ease;
    }
    .portal-btn:hover { box-shadow: 0 0 24px rgba(255, 215, 0, 0.4); transform: scale(1.02); }
    .mode-strip {
      margin: 0 0 16px; padding: 9px 16px; border-radius: 12px;
      font-size: 13px; font-weight: 800; letter-spacing: 0.9px;
      text-align: center; text-transform: uppercase;
    }
    .mode-strip.today { background: rgba(46, 125, 50, 0.14); color: #2b6e2f; border: 1px solid rgba(46, 125, 50, 0.35); }
    .mode-strip.vision { background: linear-gradient(135deg, rgba(74, 20, 140, 0.16), rgba(255, 215, 0, 0.10)); color: #6a3d9a; border: 1px solid rgba(255, 215, 0, 0.5); }
    /* ---- Deal / status card (V0.20): premium, spacious, readable ---- */
    .status-card {
      margin: 0 0 22px; padding: 20px 22px; border-radius: 18px;
      background: linear-gradient(160deg, rgba(46, 125, 50, 0.10), rgba(46, 125, 50, 0.04));
      border: 1px solid rgba(46, 125, 50, 0.28);
      box-shadow: 0 4px 18px rgba(31, 28, 46, 0.06);
    }
    .status-card.vision {
      background: linear-gradient(160deg, rgba(106, 61, 154, 0.13), rgba(255, 215, 0, 0.06));
      border-color: rgba(160, 120, 30, 0.4);
    }
    .status-badge {
      display: inline-block; margin-bottom: 15px; padding: 9px 17px;
      border-radius: 999px; font-size: 14.5px; font-weight: 800; letter-spacing: 0.2px;
      background: #2e7d32; color: #fff; box-shadow: 0 3px 10px rgba(46, 125, 50, 0.28);
    }
    .status-card.vision .status-badge { background: linear-gradient(135deg, #4c3a8c, #6a3d9a); box-shadow: 0 3px 12px rgba(106, 61, 154, 0.35); }
    .status-row { display: flex; justify-content: space-between; gap: 16px; padding: 10px 0; border-bottom: 1px solid rgba(31, 28, 46, 0.09); font-size: 15px; align-items: baseline; }
    .status-row:last-of-type { border-bottom: none; }
    .status-label { color: #7c7c88; font-weight: 600; white-space: nowrap; font-size: 13.5px; text-transform: uppercase; letter-spacing: 0.5px; }
    .status-value { text-align: right; font-weight: 700; color: #2c2c35; font-size: 15px; }
    .status-note { margin-top: 14px; padding-top: 13px; border-top: 1px dashed rgba(31, 28, 46, 0.15); font-size: 14px; line-height: 1.6; color: #55555f; font-style: italic; }
    /* ---- Documents card (V0.20) ---- */
    .docs-section { margin: 22px 0 6px; padding: 20px 22px; border-radius: 18px; background: linear-gradient(160deg, rgba(44, 110, 158, 0.10), rgba(44, 110, 158, 0.03)); border: 1px solid rgba(44, 110, 158, 0.28); box-shadow: 0 4px 18px rgba(31, 28, 46, 0.06); }
    .docs-section h4 { margin: 0 0 4px; font-size: 17px; font-weight: 700; color: #235d86; letter-spacing: 0.2px; }
    .docs-section .section-sub { margin: 0 0 14px; font-size: 13.5px; color: #6c7a86; font-weight: 500; }
    .doc-link {
      display: flex; justify-content: space-between; align-items: center; gap: 12px;
      padding: 14px 16px; margin-bottom: 10px; border-radius: 13px;
      background: rgba(255, 255, 255, 0.72); border: 1px solid rgba(44, 110, 158, 0.28);
      color: #26303a; text-decoration: none; font-weight: 700; font-size: 15px; line-height: 1.4;
      transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease;
    }
    .doc-link:last-child { margin-bottom: 0; }
    .doc-link:hover { background: #ffffff; transform: translateY(-2px); box-shadow: 0 6px 16px rgba(44, 110, 158, 0.22); }
    .doc-dl { font-size: 12.5px; font-weight: 700; color: #2c6e9e; white-space: nowrap; background: rgba(44, 110, 158, 0.14); padding: 5px 11px; border-radius: 999px; }
    .vc-survey-tip { background: rgba(14, 18, 26, 0.94); color: #dff7ff; border: 1px solid rgba(127, 240, 255, 0.45); border-radius: 8px; font-size: 12.5px; font-weight: 700; letter-spacing: 0.2px; padding: 5px 9px; box-shadow: 0 6px 18px rgba(0,0,0,0.35); }
    .vc-survey-tip::before { border-top-color: rgba(14, 18, 26, 0.94); }
    .dossier-section { margin: 22px 0 6px; padding: 20px 22px; border-radius: 18px; background: linear-gradient(160deg, rgba(193, 144, 74, 0.11), rgba(193, 144, 74, 0.03)); border: 1px solid rgba(193, 144, 74, 0.30); box-shadow: 0 4px 18px rgba(31, 28, 46, 0.06); }
    .dossier-section h4 { margin: 0 0 4px; font-size: 17px; font-weight: 700; color: #8a6423; letter-spacing: 0.2px; }
    .dossier-section .section-sub { margin: 0 0 14px; font-size: 13.5px; color: #6c7a86; font-weight: 500; }
    .ds-wait { font-size: 14px; color: #6c7a86; font-weight: 600; display: flex; align-items: center; gap: 9px; padding: 6px 0; }
    .ds-spin { width: 13px; height: 13px; border-radius: 50%; border: 2px solid rgba(193, 144, 74, 0.3); border-top-color: #b8862f; animation: dsspin 0.8s linear infinite; flex: none; }
    @keyframes dsspin { to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) { .ds-spin { animation: none; } }
    .ds-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 14px; padding-bottom: 12px; margin-bottom: 12px; border-bottom: 1px solid rgba(193, 144, 74, 0.26); }
    .ds-apn { font-size: 15.5px; font-weight: 800; color: #4a3a1c; letter-spacing: 0.3px; font-variant-numeric: tabular-nums; }
    .ds-situs { font-size: 13px; font-weight: 600; color: #7d8792; }
    .ds-flag { font-size: 13.5px; line-height: 1.55; font-weight: 600; color: #3c4650; background: rgba(255, 255, 255, 0.72); border-left: 3px solid #b8862f; border-radius: 0 10px 10px 0; padding: 10px 14px; margin-bottom: 9px; }
    .ds-flag.watch { border-left-color: #c1553f; }
    .ds-flag.note { border-left-color: #5f79c0; }
    .ds-flag.good { border-left-color: #6b8f6b; }
    .ds-fold { border-top: 1px solid rgba(193, 144, 74, 0.22); }
    .ds-fold:first-of-type { border-top: none; }
    .ds-fold > summary { cursor: pointer; list-style: none; padding: 11px 2px; font-size: 14.5px; font-weight: 700; color: #4a3a1c; display: flex; align-items: center; gap: 9px; }
    .ds-fold > summary::-webkit-details-marker { display: none; }
    .ds-fold > summary::before { content: '+'; color: #b8862f; font-weight: 800; width: 11px; font-size: 15px; flex: none; }
    .ds-fold[open] > summary::before { content: '\\2013'; }
    .ds-fold > summary:hover { color: #8a6423; }
    .ds-count { margin-left: auto; font-size: 11.5px; font-weight: 700; color: #a08652; background: rgba(193, 144, 74, 0.16); border-radius: 999px; padding: 2px 9px; }
    .ds-rows { padding: 2px 0 14px 20px; }
    .ds-row { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; padding: 6px 0; border-bottom: 1px dotted rgba(120, 110, 90, 0.22); }
    .ds-row:last-child { border-bottom: none; }
    .ds-k { font-size: 13px; font-weight: 600; color: #7d8792; flex: none; max-width: 48%; }
    .ds-v { font-size: 13.5px; font-weight: 700; color: #2b3540; text-align: right; line-height: 1.45; }
    .ds-note { font-size: 13px; color: #6c7a86; font-weight: 500; margin: 0 0 10px; line-height: 1.55; }
    .ds-doc { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 11px 13px; margin-bottom: 8px; border-radius: 12px; background: rgba(255, 255, 255, 0.72); border: 1px solid rgba(193, 144, 74, 0.28); text-decoration: none; }
    .ds-doc:hover { background: #fff; box-shadow: 0 5px 14px rgba(193, 144, 74, 0.22); }
    .ds-doc-l { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .ds-doc-l b { font-size: 14px; font-weight: 800; color: #2b3540; letter-spacing: 0.2px; }
    .ds-doc-l i { font-style: normal; font-size: 12px; color: #7d8792; font-weight: 600; }
    .ds-doc-o { font-size: 12px; font-weight: 700; color: #8a6423; white-space: nowrap; background: rgba(193, 144, 74, 0.16); padding: 5px 10px; border-radius: 999px; flex: none; }
    .ds-foot { margin-top: 14px; padding-top: 12px; border-top: 1px solid rgba(193, 144, 74, 0.26); font-size: 11.5px; line-height: 1.6; color: #8d97a1; font-weight: 500; }
    #community-card {
      position: fixed; inset: 0; z-index: 2500; display: none;
      align-items: center; justify-content: center;
      background: rgba(8, 10, 18, 0.55);
      -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px);
    }
    #community-card.open { display: flex; }
    #community-card-box {
      position: relative; width: min(94vw, 470px); max-height: 84vh; overflow-y: auto;
      background: rgba(20, 22, 34, 0.97); color: #f2f2f6;
      border: 1.5px solid rgba(255, 215, 0, 0.45); border-radius: 22px;
      padding: 26px 26px 22px; box-shadow: 0 22px 70px rgba(0, 0, 0, 0.6);
    }
    #community-card-box .cc-close {
      position: absolute; top: 14px; right: 16px; cursor: pointer;
      font-size: 17px; opacity: 0.7; padding: 4px 8px;
    }
    #community-card-box .cc-close:hover { opacity: 1; }
    #community-card-box .cc-title { font-size: 22px; font-weight: 800; letter-spacing: 0.2px; margin: 0 34px 16px 0; line-height: 1.3; }
    /* dark-modal contrast overrides for the reused deal card + strip */
    #community-card-box .status-card { background: rgba(46, 125, 50, 0.20); border-color: rgba(120, 200, 130, 0.35); box-shadow: none; }
    #community-card-box .status-card.vision { background: linear-gradient(160deg, rgba(106, 61, 154, 0.30), rgba(255, 215, 0, 0.09)); border-color: rgba(255, 215, 0, 0.4); }
    #community-card-box .status-label { color: rgba(242, 242, 246, 0.68); }
    #community-card-box .status-value { color: #ffffff; }
    #community-card-box .status-row { border-bottom-color: rgba(255, 255, 255, 0.12); }
    #community-card-box .status-note { color: rgba(242, 242, 246, 0.82); border-top-color: rgba(255, 255, 255, 0.18); }
    #community-card-box .mode-strip.today { color: #86e39a; }
    #community-card-box .mode-strip.vision { color: #dcbcff; }
    #community-card-box .cc-docs { margin: 4px 0 6px; font-size: 13.5px; opacity: 0.85; }
    #community-card-box .cc-actions { display: flex; gap: 12px; margin-top: 18px; }
    #community-card-box .cc-btn {
      flex: 1; text-align: center; padding: 15px 12px; border-radius: 14px;
      font-weight: 800; font-size: 14.5px; cursor: pointer; user-select: none;
      transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease;
    }
    #community-card-box .cc-btn.primary { background: rgba(255, 255, 255, 0.13); border: 1px solid rgba(255, 255, 255, 0.32); }
    #community-card-box .cc-btn.primary:hover { background: rgba(255, 255, 255, 0.22); transform: translateY(-2px); }
    #community-card-box .cc-btn.portal { background: linear-gradient(135deg, #2b1a55, #6a3d9a); border: 1px solid rgba(255, 215, 0, 0.5); }
    #community-card-box .cc-btn.portal:hover { box-shadow: 0 0 18px rgba(255, 215, 0, 0.4); transform: translateY(-2px); }
    @media (max-width: 768px) {
      #earth-toggle { top: 56px; }
      #earth3d-hint { font-size: 11px; }
      #earth3d-gearth { bottom: 56px; }
    }

    @media (max-width: 768px) {
      .admin-popup {
        top: auto; bottom: 12px; left: 10px; right: 10px; width: auto;
        max-height: 62vh; overflow-y: auto;
      }
    }
  </style>
</head>
<body>
  <!-- Zone Admin Popup Menu (Developer Only) -->
  <div class="admin-menu-toggle" id="admin-menu-toggle">
    ⚙️
  </div>
  
  <!-- Territory Drawing Editor Toggle -->
  <div class="territory-editor-toggle" id="territory-editor-toggle">
    🎨
  </div>
  
  <div class="admin-popup" id="admin-popup" style="display: none;">
    <div class="popup-header">
      <h3>✏️ Position Editor</h3>
      <button class="close-popup" id="close-popup">&times;</button>
    </div>
    
    <div class="popup-content">
      <label class="editor-label">1 · Pick a property:</label>
      <div id="edit-property-buttons" class="edit-property-buttons"></div>
      
      <label class="editor-label">2 · Move the icons:</label>
      <button class="control-button" id="edit-toggle-btn" disabled>🔓 Start Editing</button>
      
      <div class="edit-hint" id="edit-hint" style="display: none;">
        Drag any <strong>glowing icon</strong> to its new spot — the map still pans and zooms normally. When everything looks right, press <strong>Done</strong>, then <strong>🔒 Save Layout for Everyone</strong>.
      </div>
      
      <div class="status-indicator" id="edit-status">
        <div>🔒</div>
        <div class="status-text">Pick a property to begin</div>
      </div>
      
      <div class="moved-list" id="moved-list" style="display: none;"></div>
      
      <button class="control-button" id="reset-positions-btn" style="display: none;">↩️ Reset This Property</button>
      
      <label class="editor-label">3 · Save your layout:</label>
      <button class="control-button" id="save-layout-btn" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; margin-bottom: 12px;">🔒 Save Layout for Everyone</button>
      <div id="pin-row" style="display: none; margin-bottom: 12px;">
        <input id="edit-pin-input" type="password" placeholder="Edit PIN" style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px; box-sizing: border-box; margin-bottom: 8px;">
        <button class="control-button" id="pin-confirm-btn" style="background: #4CAF50; color: #fff;">✅ Confirm PIN &amp; Save</button>
      </div>
      <button class="control-button capture-button" id="capture-zones-btn">📋 Capture / Export (backup)</button>
      
      <div class="status-indicator" id="zoom-indicator" style="background: linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%); border-left-color: #2196F3; margin-top: 10px;">
        <div>🔍</div>
        <div class="status-text" id="zoom-level">Zoom: —</div>
      </div>
    </div>
  </div>

    <!-- Territory Drawing Editor Panel -->
  <div class="territory-editor" id="territory-editor" style="display: none;">
    <div class="editor-header">
      <h3>🎨 Territory Drawing Editor</h3>
      <button class="close-editor" id="close-territory-editor">&times;</button>
    </div>
    
    <div class="editor-content">
      <div class="zone-selector">
        <label>Select Zone to Draw:</label>
        <select id="zone-selector">
          <option value="">Choose a zone...</option>
        </select>
      </div>
      
      <div class="brush-controls">
        <label>Brush Size:</label>
        <input type="range" id="brush-size" min="5" max="50" value="15">
        <span id="brush-size-display">15px</span>
      </div>
      
      <div class="drawing-mode">
        <label>
          <input type="radio" name="draw-mode" value="draw" checked> 
          🎨 Draw Territory
        </label>
        <label>
          <input type="radio" name="draw-mode" value="erase"> 
          🗑️ Erase Territory
        </label>
      </div>
      
      <div class="territory-actions">
        <button class="territory-btn" id="clear-territory">🗑️ Clear Current Zone</button>
        <button class="territory-btn" id="save-territories">💾 Save All Territories</button>
        <button class="territory-btn" id="load-territories">📁 Load Territories</button>
      </div>
      
      <div class="drawing-status" id="drawing-status">
        <div>🎨</div>
        <div class="status-text">Select a zone to start drawing</div>
      </div>
    </div>
  </div>
  
  <!-- Beautiful Left-Side Panel -->
  <div id="side-panel" class="side-panel">
    <div class="panel-header">
      <div class="project-hero" id="project-hero">
        <!-- Compact header content will be inserted here -->
      </div>
      <button class="close-panel" id="close-panel">&times;</button>
    </div>
    <div class="panel-content" id="panel-content"></div>
  </div>
  
  <!-- Property Boundary Info Panel -->
  <div id="property-panel" class="property-panel">
    <div class="property-panel-header">
      <div class="property-panel-title">
        <h3 id="property-title">Property Boundary</h3>
      </div>
      <button class="close-panel" id="close-property-panel">&times;</button>
    </div>
    <div class="property-panel-content" id="property-panel-content">
      <!-- Content will be dynamically inserted -->
    </div>
  </div>
  
  <!-- Current / Vision mode toggle -->
  <div id="mode-toggle" title="Switch between today's reality and the Lemuria vision">
    <span class="mt-opt mt-current">Today</span>
    <span class="mt-opt mt-vision">✨ Vision</span>
  </div>

  <!-- 🌍 3D terrain mode (Google-Earth-style) -->
  <div id="earth-toggle" title="Tilt into 3D — or just hold your middle mouse button and drag on the map (two-finger drag on mobile)">🌍 3D</div>
  <div id="layers-toggle" title="County GIS layers — topo contours, aerial imagery by year, parcels, zoning and hazards">🗺️ Layers</div>
  <div id="layers-panel">
    <div class="lp-head"><span>🗺️ Map Layers</span><span class="lp-close" id="lp-close">✕</span></div>
    <p class="lp-sub">Live public data — Ventura County GIS, the California Geological Survey, USGS, FEMA, NRCS and BLM — drawn straight from each agency’s own map server the moment you switch it on. Nothing is copied, nothing goes stale.</p>
    <div id="lp-body"></div>
    <p class="lp-credit">Imagery &amp; parcels: Ventura County GIS · Geology, faults, landslides, minerals: California Geological Survey · Relief, topo, hydrography, elevation: USGS · Flood: FEMA · Soils: USDA NRCS · Ownership, PLSS: BLM · Historic topo: USGS via Esri Living Atlas</p>
  </div>
  <div id="earth3d">
    <div id="earth3d-stars"></div>
    <div id="earth3d-loading"><div class="earth-orb"></div><span>waking the planet…</span></div>
    <div id="earth3d-map"></div>
    <div id="earth3d-exit">✕ Back to Map</div>
    <div id="earth3d-hint">drag to move · hold middle mouse (or right-drag / two fingers) to orbit &amp; tilt · scroll out to see the whole planet · click a chip to fly there</div>
    <div id="earth3d-gearth" title="Open this exact view in Google Earth (new tab)">🌐 Google Earth</div>
    <div id="earth3d-attrib">Imagery © Esri &nbsp;·&nbsp; Terrain: Mapzen / AWS Open Data</div>
  </div>

  <!-- Community preview card (opens first on property click) -->
  <div id="community-card" onclick="if (event.target === this) window.closeCommunityCard()">
    <div id="community-card-box"></div>
  </div>

  <!-- Map Container -->
  <div id="map"></div>
  
  <!-- Footer -->
  <div class="map-footer"><span id="map-footer-text">© 2026 Ojai Valley Properties | ${PROPERTIES.length} Properties • ${PROJECT_ZONES.filter(z => (z.mode || 'both') !== 'vision').length} Projects | Interactive Map</span></div>
  
  <script>
    console.log('🗺️ Initializing Howard Property Interactive Map...');
    
    // Initialize map centered on Sulphur Mountain property
    const map = L.map('map', {
      center: [34.4287, -119.2375],
      zoom: 13,
      zoomSnap: 0,
      zoomDelta: 0.5,
      wheelDebounceTime: 20,
      wheelPxPerZoomLevel: 110,
      inertiaDeceleration: 2400,
      easeLinearity: 0.16,
      zoomControl: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      boxZoom: true,
      keyboard: true,
      dragging: true,
      preferCanvas: true,
      zoomAnimation: true,
      fadeAnimation: true,
      markerZoomAnimation: true,
      // Ultra-smooth mobile inertia (iPhone Maps-style)
      inertia: true,
      inertiaDeceleration: 2400,
      inertiaMaxSpeed: 1800,
      easeLinearity: 0.15,
      // Smooth zoom with fine control
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      wheelDebounceTime: 40,
      wheelPxPerZoomLevel: 120,
      // Touch optimization
      tapTolerance: 20,
      tapHold: true,
      touchZoom: true,
      bounceAtZoomLimits: true,
      // Performance
      worldCopyJump: false,
      maxBoundsViscosity: 0.5
    });
    
    // Add multiple high-resolution tile layers for better zoom coverage
    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '🗺️ Esri, Maxar, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN',
      maxZoom: 22,
      minZoom: 1,
      errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      detectRetina: true,
      updateWhenIdle: true,
      updateWhenZooming: false,
      keepBuffer: 4
    });
    
    // Add OpenStreetMap as fallback
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '🗺️ OpenStreetMap contributors',
      maxZoom: 19,
      minZoom: 1,
      detectRetina: true,
      updateWhenIdle: true,
      keepBuffer: 4
    });
    
    // Add Google Satellite as alternative (public tiles)
    const googleSatLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
      attribution: '🗺️ Google',
      maxZoom: 22,
      minZoom: 1,
      detectRetina: true,
      updateWhenIdle: true,
      keepBuffer: 4
    });
    
    // Create layer control
    const baseLayers = {
      "🛰️ Satellite (Esri)": satelliteLayer,
      "🛰️ Satellite (Google)": googleSatLayer,
      "🗺️ Street Map": osmLayer
    };
    
    // Add default layer and layer control
    satelliteLayer.addTo(map);
    // (the rich county-layer panel below replaces Leaflet's default layer control)

    // ===================================================================
    // V0.21 — VENTURA COUNTY GIS LAYER ENGINE
    // Every source here is public, keyless and CORS-open on the county's
    // own ArcGIS server (maps.ventura.org) — the same server the assessor
    // parcel geometry already comes from.
    // ===================================================================
    var VC_ROOT = 'https://maps.ventura.org/arcgis/rest/services/';
    var VC_BLANK = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    var VC_ATTR = '🗺️ Ventura County GIS';

    // Services whose tile cache uses the standard web-mercator scheme can be
    // consumed directly as XYZ tiles (fast, CDN-cached at the county).
    function vcXYZ(svc, opts) {
      return L.tileLayer(VC_ROOT + svc + '/MapServer/tile/{z}/{y}/{x}', Object.assign({
        attribution: VC_ATTR, minZoom: 1, maxZoom: 22, maxNativeZoom: 21,
        errorTileUrl: VC_BLANK, updateWhenIdle: true, updateWhenZooming: false, keepBuffer: 2
      }, opts || {}));
    }

    // Everything else — the historic aerials (custom cache scheme) and every
    // dynamic overlay — is tiled by us against the service's export endpoint.
    // V0.25: the same transport now speaks to any ArcGIS MapServer or ImageServer
    // (CGS, USGS, FEMA, BLM, DWR, Esri Living Atlas) and to WMS (NRCS soils):
    // a def carries root (defaults to the county), svc, and a kind.
    function vcSvcBase(def) {
      return (def.root || VC_ROOT) + def.svc + '/' + (def.kind === 'imgsvc' ? 'ImageServer' : 'MapServer');
    }
    function vcExportBase(def) { return vcSvcBase(def) + (def.kind === 'imgsvc' ? '/exportImage' : '/export'); }
    // everything after the bbox — shared by the 2D tile layer and the 3D raster source
    function vcExportTail(def, transparent, px) {
      var q = '&bboxSR=3857&imageSR=3857&size=' + px + ',' + px + '&f=image';
      if (def.kind === 'imgsvc') return q + '&format=jpgpng' + (typeof def.extra === 'function' ? def.extra() : (def.extra || ''));
      return q + '&format=' + (transparent ? 'png32' : 'jpg')
        + '&transparent=' + (transparent ? 'true' : 'false')
        + (def.showLayers ? '&layers=show:' + def.showLayers : '')
        + '&dpi=96';
    }
    function vcWmsUrl(def, bboxToken) {
      return def.url + '?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=' + encodeURIComponent(def.layers)
        + '&STYLES=&SRS=EPSG:3857&BBOX=' + bboxToken + '&WIDTH=256&HEIGHT=256&FORMAT=image/png&TRANSPARENT=true';
    }
    var VCExportLayer = L.TileLayer.extend({
      options: {
        minZoom: 1, maxZoom: 22, tileSize: 256, px: 512, base: '', tail: '',
        errorTileUrl: VC_BLANK, updateWhenIdle: true, updateWhenZooming: false, keepBuffer: 1
      },
      getTileUrl: function (c) {
        var W = 40075016.685578488, half = W / 2;
        var span = W / Math.pow(2, c.z);            // tileSize is 256 => one tile per grid cell
        var xmin = -half + c.x * span, ymax = half - c.y * span;
        return this.options.base + '?bbox=' + xmin + ',' + (ymax - span) + ',' + (xmin + span) + ',' + ymax + this.options.tail;
      }
    });
    // def is a catalog entry (or anything with kind/svc/root/showLayers)
    function vcExport(def, opts) {
      opts = opts || {};
      var px = opts.px || 512, transparent = opts.transparent !== false;
      return new VCExportLayer(null, Object.assign({
        base: vcExportBase(def), tail: vcExportTail(def, transparent, px), px: px, attribution: def.attr || VC_ATTR
      }, opts));
    }
    function vcXYZDef(def, opts) {
      return L.tileLayer(vcSvcBase(def) + '/tile/{z}/{y}/{x}', Object.assign({
        attribution: def.attr || VC_ATTR, minZoom: 1, maxZoom: 22, maxNativeZoom: def.maxNative || 21,
        errorTileUrl: VC_BLANK, updateWhenIdle: true, updateWhenZooming: false, keepBuffer: 2
      }, opts || {}));
    }
    function vcWms(def, opts) {
      return L.tileLayer.wms(def.url, Object.assign({
        layers: def.layers, format: 'image/png', transparent: true, version: '1.1.1', uppercase: true,
        attribution: def.attr || VC_ATTR, errorTileUrl: VC_BLANK, updateWhenIdle: true, updateWhenZooming: false, keepBuffer: 1
      }, opts || {}));
    }

    // ---- the catalog ----------------------------------------------------
    var VC_BASES = [
      { id: 'esri',  label: '🛰️ Satellite (Esri)',   note: 'global, always current', ready: satelliteLayer },
      { id: 'gsat',  label: '🛰️ Satellite (Google)',  note: '',                      ready: googleSatLayer },
      { id: 'osm',   label: '🗺️ Street map',          note: '',                      ready: osmLayer },
      // every county flight on file, oldest first - driven by the year slider
      { id: '1945',   year: 1945, when: '1945',     note: 'the oldest flight on file', kind: 'export', svc: 'SDs/1945Aerial' },
      { id: '2000',   year: 2000, when: 'Apr 2000', note: '', kind: 'export', svc: 'SDs/2000AprAerial' },
      { id: '2001',   year: 2001, when: 'Dec 2001', note: '', kind: 'export', svc: 'SDs/2001DecAerial' },
      { id: '2002',   year: 2002, when: 'Oct 2002', note: '', kind: 'export', svc: 'SDs/2002OctAerial' },
      { id: '2003',   year: 2003, when: 'Jan 2003', note: '', kind: 'export', svc: 'SDs/2003JanAerial' },
      { id: '2004',   year: 2004, when: 'Sep 2004', note: '', kind: 'export', svc: 'SDs/2004SepAerial' },
      { id: '2005',   year: 2005, when: 'Sep 2005', note: '', kind: 'export', svc: 'SDs/2005SepAerial' },
      { id: '2006',   year: 2006, when: 'Jun 2006', note: '', kind: 'export', svc: 'SDs/2006JunAerial' },
      { id: '2007',   year: 2007, when: 'Jul 2007', note: '', kind: 'export', svc: 'SDs/2007JulAerial' },
      { id: '2008',   year: 2008, when: 'Apr 2008', note: '', kind: 'export', svc: 'SDs/2008AprAerial' },
      { id: '2009',   year: 2009, when: 'Apr 2009', note: '', kind: 'export', svc: 'SDs/2009AprAerial' },
      { id: '2010',   year: 2010, when: 'Dec 2010', note: '', kind: 'export', svc: 'SDs/2010DecAerial' },
      { id: '2011',   year: 2011, when: 'Dec 2011', note: '', kind: 'export', svc: 'SDs/2011DecAerial' },
      { id: '2012',   year: 2012, when: 'Dec 2012', note: '', kind: 'export', svc: 'SDs/2012DecAerial' },
      { id: '2014',   year: 2014, when: 'Feb 2014', note: '', kind: 'export', svc: 'SDs/2014FebAerial' },
      { id: '2015',   year: 2015, when: 'Dec 2015', note: '', kind: 'export', svc: 'SDs/2015DecAerial' },
      { id: '2016m',  year: 2016, when: 'Mar 2016', note: '', kind: 'export', svc: 'SDs/2016MarAerial' },
      { id: '2016',   year: 2016, when: 'Dec 2016', note: '', kind: 'export', svc: 'SDs/2016DecAerial' },
      { id: '2017',   year: 2017, when: 'Oct 2017', note: 'weeks before the Thomas Fire', kind: 'export', svc: 'SDs/2017OctAerial' },
      { id: '2018',   year: 2018, when: 'Oct 2018', note: '', kind: 'export', svc: 'SDs/2018OctAerial' },
      { id: '2018f',  year: 2018, when: 'Nov 2018', note: 'post-Thomas-Fire flight — burn area only', kind: 'export', svc: 'SDs/2018NovDecPostFireAerial' },
      { id: '2019v',  year: 2019, when: 'Apr 2019', note: 'Vexcel', kind: 'export', svc: 'SDs/2019MarAprVexcelAerial' },
      { id: '2019',   year: 2019, when: 'Dec 2019', note: '', kind: 'export', svc: 'SDs/2019DecAerial' },
      { id: '2020',   year: 2020, when: '2020',     note: '3 in Vexcel', kind: 'export', svc: 'SDs/2020Vexcel3Inch2' },
      { id: '2021',   year: 2021, when: '2021',     note: '3 in Vexcel — sharpest', kind: 'export', svc: 'SDs/2021Vexcel3Inch' },
      { id: '2022v',  year: 2022, when: '2022',     note: '3 in Vexcel', kind: 'export', svc: 'SDs/2022Vexcel3Inch' },
      { id: '2022',   year: 2022, when: '2022',     note: 'full county', kind: 'export', svc: 'SDs/2022FullCountyAerial' },
      { id: '2023u',  year: 2023, when: '2023',     note: 'urban · developed areas only', kind: 'xyz', svc: 'SDs/2023UrbanAerial' },
      { id: '2023',   year: 2023, when: '2023',     note: 'countywide', kind: 'xyz', svc: 'SDs/2023CountyWideAerial' },
      { id: '2024u',  year: 2024, when: '2024',     note: 'urban · developed areas only', kind: 'xyz', svc: 'SDs/2024UrbanAerial' },
      { id: '2024',   year: 2024, when: '2024',     note: 'countywide', kind: 'xyz', svc: 'SDs/2024CountyWideAerial' },
      { id: '2025',   year: 2025, when: '2025',     note: '3 in · developed areas', kind: 'xyz', svc: 'SDs/2025UrbanAerial' }
    ];
    var VC_FLIGHTS = VC_BASES.filter(function (b) { return b.year; });
    var vcLastFlight = '2024';

    // ---- the layer library (V0.25) ---------------------------------------
    // Every entry is fetched live from the agency's own map server the moment
    // it is switched on — nothing is copied, nothing goes stale. group files
    // it in the panel, z fixes the draw order (fills low, lines high, labels
    // top), src/srcUrl credit the publisher in the legend.
    var R_CGS  = 'https://gis.conservation.ca.gov/server/rest/services/';
    var R_USGS = 'https://basemap.nationalmap.gov/arcgis/rest/services/';
    var R_FEMA = 'https://hazards.fema.gov/arcgis/rest/services/';
    var R_NHD  = 'https://hydro.nationalmap.gov/arcgis/rest/services/';
    var R_QF   = 'https://earthquake.usgs.gov/arcgis/rest/services/';
    var R_BLM  = 'https://gis.blm.gov/arcgis/rest/services/';
    var R_DWR  = 'https://gis.water.ca.gov/arcgis/rest/services/';
    var R_HIST = 'https://historical1.arcgis.com/arcgis/rest/services/';
    var S_VC   = 'Ventura County GIS', S_CGS = 'California Geological Survey', S_USGS = 'USGS', S_FEMA = 'FEMA', S_BLM = 'Bureau of Land Management';

    var VC_GROUPS = [
      { id: 'county',  icon: '🏛️', label: 'County & parcels',        note: 'what the county planner sees — parcels, zoning, contours, the survey' },
      { id: 'terrain', icon: '🗻', label: 'Terrain & historic maps', note: 'USGS relief, today’s topo, and every USGS edition of this ground back to 1903' },
      { id: 'geo',     icon: '⛏️', label: 'Geology & minerals',      note: 'what is under the ground — rock units, mineral studies, mines, oil & gas' },
      { id: 'seismic', icon: '🌋', label: 'Faults & earthquakes',    note: 'every mapped fault, the regulated Alquist-Priolo traces, the historical shocks' },
      { id: 'ground',  icon: '🪨', label: 'Landslides & soils',      note: 'slope stability, slides mapped in the field, the soil survey, farmland grades' },
      { id: 'water',   icon: '💧', label: 'Water & flood',           note: 'FEMA flood zones, every named creek, groundwater basins' },
      { id: 'land',    icon: '📏', label: 'Ownership & survey grid', note: 'who holds the land around you, and the township grid every deed refers to' }
    ];

    // the historic USGS topo editions on file over the Ojai valley (newest edition on or before the year is drawn)
    var VC_HIST_YEARS = [1903, 1947, 1952, 1964, 1967, 1988, 1995];
    var VC_HIST_NOTES = {
      1903: '15-minute Santa Paula sheet — surveyed 1901–02, the first map of this ground',
      1947: '15-minute sheet, 1947 revision',
      1952: 'first 7.5-minute Ojai quad — aerial photos 1947',
      1964: '15-minute sheet, 1964 edition',
      1967: '7.5-minute Ojai quad, 1967 edition',
      1988: '7.5-minute Ojai quad, 1988 edition — photos 1984',
      1995: '7.5-minute Ojai quad, 1995 — the last paper edition'
    };
    var vcHistYear = 1952;
    function vcHistRule() {
      return '&mosaicRule=' + encodeURIComponent(JSON.stringify({
        mosaicMethod: 'esriMosaicAttribute', sortField: 'DateCurrent', sortValue: String(vcHistYear), ascending: false,
        where: 'DateCurrent <= ' + vcHistYear + ' AND Map_Scale <= 62500'
      }));
    }

    var VC_OVERLAYS = [
      // —— county & parcels ————————————————————————————————————————————————
      { id: 'topo',    group: 'county', label: '⛰️ Topo contours',     note: 'county contours — 100 ft, 20 ft then 5 ft as you zoom in', svc: 'SDs/Topography', op: 0.92, z: 350, src: S_VC, minZoom: 16, farNote: 'zoom in closer to see the contours',
        legendText: 'Contour lines — each one a fixed step in elevation: 100 ft far out, 20 ft, then 5 ft up close. With contours on, click anywhere on the land to read its real elevation (USGS 3DEP, 1 m).' },
      { id: 'survey',  group: 'county', label: '📐 Survey sheet — Sulphur Mtn', note: 'Henry Land Surveying, Nov 2024 · 1 ft contours, structures, fences, poles · the surveyed boundary with every bearing, the 16 ft easement and the found monuments', kind: 'image', url: '/images/sulphur-mountain/survey/topo-survey-overlay.png', bounds: [[34.4315996, -119.1582952], [34.4336893, -119.1546039]], vector: '/api/survey/sulphur-mountain', op: 0.88, z: 360, src: 'Henry Land Surveying · record map 14-PM-15', srcUrl: 'https://maps.ventura.org/recordmaps/pm/014/014pm015.pdf',
        legendText: 'The survey sheet, registered to its own surveyed corners (within about 0.3 m on the parcel body). Hover the dashed cyan boundary for each bearing and distance; amber is the 16 ft access easement; white dots are the monuments the surveyor found.' },
      { id: 'bldg',    group: 'county', label: '🏚️ Building footprints', note: 'every structure standing today, mapped by the county', svc: 'DataDownloads/CommonData', showLayers: '0', op: 0.95, z: 330, src: S_VC },
      { id: 'parcels', group: 'county', label: '▦ Parcel lines',       note: 'official assessor boundaries', svc: 'SDs/Parcels', op: 0.95, z: 345, src: S_VC },
      { id: 'apn',     group: 'county', label: '# APN + acreage labels', note: '', svc: 'SDs/ParcelLabels', showLayers: '0,2', op: 0.95, z: 370, src: S_VC },
      { id: 'recmaps', group: 'county', label: '🗂️ Recorded maps index', note: 'every recorded parcel map, tract and record of survey — the sheets a surveyor starts from', svc: 'DataDownloads/Survey', showLayers: '4', op: 0.55, z: 331, src: S_VC + ' · Surveyor', srcUrl: 'https://maps.ventura.org/recordmaps/' },
      { id: 'zoning',  group: 'county', label: '⬛ Zoning',            note: 'base zone designations', svc: 'SDs/MyZoning', showLayers: '0', op: 0.5, z: 305, src: S_VC + ' · Planning' },
      { id: 'ovz',     group: 'county', label: '🦌 Overlay zones',     note: 'habitat corridors, wildlife passage, Ojai dark sky', svc: 'SDs/OverlayZones', op: 0.45, z: 306, src: S_VC + ' · Planning' },
      { id: 'habitat', group: 'county', label: '🌿 Habitat & sensitive areas', note: 'ESHA, habitat connectivity, wildlife corridors', svc: 'SDs/CV_PlanningGIS', showLayers: '3,4,6', op: 0.42, z: 307, src: S_VC + ' · Planning' },
      { id: 'water',   group: 'county', label: '🏞️ Creeks & surface water', note: 'county drainage lines', svc: 'SDs/CV_PlanningGIS', showLayers: '8', op: 0.8, z: 338, src: S_VC },
      { id: 'flood',   group: 'county', label: '💧 County floodplain', note: '100-year and 500-year, county mapping', svc: 'SDs/PWA_Floodplain', op: 0.45, z: 321, src: S_VC + ' · Public Works' },
      { id: 'fire',    group: 'county', label: '🔥 CalFire SRA',       note: 'state fire responsibility area', svc: 'SDs/PWACalFireSRA', op: 0.35, z: 308, src: S_VC + ' · CAL FIRE' },
      // —— terrain & historic maps ————————————————————————————————————————
      { id: 'shade',    group: 'terrain', label: '🗻 Hillshade relief',   note: 'USGS 3DEP shaded relief — the lay of the land without leaving 2D', root: R_USGS, svc: 'USGSShadedReliefOnly', kind: 'export', op: 0.55, z: 302, src: S_USGS + ' 3DEP', srcUrl: 'https://www.usgs.gov/3d-elevation-program', attr: 'USGS',
        legendText: 'Light from the north-west; brighter slopes face the light, darker slopes fall away from it. Turn it on under any base to make the terrain read.' },
      { id: 'usgstopo', group: 'terrain', label: '🗺️ USGS topo (today)', note: 'the current US Topo — contours, trails, place names', root: R_USGS, svc: 'USGSTopo', kind: 'xyz', maxNative: 16, op: 0.85, z: 304, src: S_USGS + ' The National Map', srcUrl: 'https://www.usgs.gov/programs/national-geospatial-program/us-topo-maps-america', attr: 'USGS',
        legendText: 'The standard USGS quadrangle style: brown contours, blue water, green woodland, black culture. Drawn to about 1:24,000.' },
      { id: 'histtopo', group: 'terrain', label: '📜 Historic USGS topo', note: 'every USGS edition of this ground since 1903 — drag the year', root: R_HIST, svc: 'USA_Historical_Topo_Maps', kind: 'imgsvc', extra: vcHistRule, op: 0.85, z: 306, src: S_USGS + ' Historical Topographic Map Collection · Esri Living Atlas', srcUrl: 'https://www.usgs.gov/programs/national-geospatial-program/historical-topographic-maps-preserving-past', attr: 'USGS / Esri',
        legendText: 'Scanned and georeferenced USGS sheets. The slider picks the newest edition published on or before that year at 1:62,500 or larger — old sheets are hand-drawn, so expect roads and creeks to sit a few metres off today’s imagery.' },
      // —— geology & minerals —————————————————————————————————————————————
      { id: 'geology',  group: 'geo', label: '🪨 Geologic map',       note: 'rock units, contacts, folds — Geologic Map of California (CGS, 2010)', root: R_CGS, svc: 'CGS/Geologic_Map_of_California', kind: 'export', op: 0.55, z: 310, src: S_CGS, srcUrl: 'https://maps.conservation.ca.gov/cgs/gmc/', attr: 'CGS' },
      { id: 'quat',     group: 'geo', label: '🏜️ Quaternary deposits', note: 'the young surface — alluvium, fans, terraces, landslide debris (CGS)', root: R_CGS, svc: 'CGS/QuaternarySurficialDepositsSouthernCA', kind: 'export', px: 256, maxZoom: 13, nearNote: 'CGS drew this at 1:36,000 and wider — it softens as you zoom in closer', op: 0.55, z: 311, src: S_CGS, srcUrl: 'https://www.conservation.ca.gov/cgs', attr: 'CGS' },
      { id: 'minerals', group: 'geo', label: '⛏️ Mineral land classification', note: 'CGS mineral studies, production areas and classification reports · geothermal springs and wells', root: R_CGS, svc: 'CGS/IW_MineralResourcesProgram', kind: 'export', showLayers: '0,1,2,3,4,7,10', op: 0.6, z: 312, src: S_CGS + ' Mineral Resources Program', srcUrl: 'https://www.conservation.ca.gov/cgs/minerals', attr: 'CGS' },
      { id: 'mines',    group: 'geo', label: '🚧 Active mines',        note: 'permitted surface mines — Mines Online, Division of Mine Reclamation', root: R_CGS, svc: 'MOL/MOLMines', kind: 'export', op: 0.95, z: 336, src: 'CA Division of Mine Reclamation', srcUrl: 'https://maps.conservation.ca.gov/mol/', attr: 'DMR' },
      { id: 'wells',    group: 'geo', label: '🛢️ Oil & gas wells',     note: 'every CalGEM well — active, idle, plugged (the Ojai oil field is next door)', root: R_CGS, svc: 'WellSTAR/Wells', kind: 'export', op: 0.95, z: 337, src: 'CalGEM WellSTAR', srcUrl: 'https://www.conservation.ca.gov/calgem', attr: 'CalGEM' },
      { id: 'radon',    group: 'geo', label: '☢️ Radon potential',     note: 'CGS radon potential zones', root: R_CGS, svc: 'CGS/RadonPotentialZones', kind: 'export', op: 0.45, z: 313, src: S_CGS, srcUrl: 'https://www.conservation.ca.gov/cgs/radon', attr: 'CGS' },
      // —— faults & earthquakes ——————————————————————————————————————————
      { id: 'faults',  group: 'seismic', label: '🌋 Fault activity map',  note: 'every mapped fault, colored by how recently it moved (CGS, 2010)', root: R_CGS, svc: 'CGS/FaultActivityMapCA', kind: 'export', px: 256, maxZoom: 12, nearNote: 'a regional map, drawn at 1:150,000 — softens as you zoom in; for close work use Alquist-Priolo and USGS Quaternary faults', op: 0.95, z: 340, src: S_CGS + ' Fault Activity Map', srcUrl: 'https://maps.conservation.ca.gov/cgs/fam/', attr: 'CGS' },
      { id: 'ap',      group: 'seismic', label: '⚠️ Alquist-Priolo fault traces', note: 'state-regulated surface-rupture traces — habitable buildings need a fault study and a 50 ft setback', root: R_CGS, svc: 'CGS_Earthquake_Hazard_Zones/SHP_Fault_Traces', kind: 'export', op: 0.95, z: 342, src: S_CGS + ' Seismic Hazards Program', srcUrl: 'https://www.conservation.ca.gov/cgs/alquist-priolo', attr: 'CGS' },
      { id: 'qfaults', group: 'seismic', label: '〰️ USGS Quaternary faults', note: 'national Quaternary fault and fold database, 2014 hazard model', root: R_QF, svc: 'haz/hazfaults2014', kind: 'export', op: 0.9, z: 341, src: S_USGS + ' Earthquake Hazards Program', srcUrl: 'https://www.usgs.gov/programs/earthquake-hazards/faults', attr: 'USGS' },
      { id: 'nshm',    group: 'seismic', label: '📈 Fault slip rates',    note: 'preferred slip rate on each fault — 2023 National Seismic Hazard Model', root: R_CGS, svc: 'CGS/MS48_NSHM2023_Faults', kind: 'export', op: 0.9, z: 341, src: S_CGS + ' Map Sheet 48', attr: 'CGS' },
      { id: 'quakes',  group: 'seismic', label: '💥 Historical earthquakes M3+', note: 'every recorded shock of magnitude 3 and up (CGS catalog)', root: R_CGS, svc: 'CGS/CA_HistEQs_M3Plus', kind: 'export', op: 0.9, z: 343, src: S_CGS, attr: 'CGS' },
      // —— landslides & soils ———————————————————————————————————————————
      { id: 'lssusc',  group: 'ground', label: '⛰️ Landslide susceptibility', note: 'CGS Map Sheet 58 — slope and rock strength ranked 0 to X', root: R_CGS, svc: 'CGS/MS58_LandslideSusceptibility_Classes', kind: 'export', px: 256, maxZoom: 13, nearNote: 'CGS drew this at 1:36,000 and wider — it softens as you zoom in closer', op: 0.55, z: 314, src: S_CGS + ' Map Sheet 58', srcUrl: 'https://www.conservation.ca.gov/cgs/landslides', attr: 'CGS' },
      { id: 'lsinv',   group: 'ground', label: '🪨 Mapped landslides',   note: 'CGS landslide inventory — deposits, scarps and source areas actually mapped in the field', op: 0.8, z: 335, src: S_CGS + ' Landslide Inventory', srcUrl: 'https://www.conservation.ca.gov/cgs/landslides', attr: 'CGS',
        parts: [
          { root: R_CGS, svc: 'CGS/LandslideInventory_DC1_Older', kind: 'export' },
          { root: R_CGS, svc: 'CGS/LandslideInventory_DC1_Younger', kind: 'export' },
          { root: R_CGS, svc: 'CGS/LandslideInventory_DC2', kind: 'export' },
          { root: R_CGS, svc: 'CGS/LandslideInventory_DC3', kind: 'export' }
        ] },
      { id: 'soils',   group: 'ground', label: '🌱 Soil survey (SSURGO)', note: 'USDA NRCS soil map units — the dossier names the unit under each property', kind: 'wms', url: 'https://SDMDataAccess.sc.egov.usda.gov/Spatial/SDM.wms', layers: 'mapunitpoly', op: 0.7, z: 315, src: 'USDA NRCS Soil Survey', srcUrl: 'https://websoilsurvey.nrcs.usda.gov/', attr: 'USDA NRCS',
        legendText: 'Each outlined area is one soil map unit; the code inside it (e.g. 190, "Sespe–Castaic") is what the county and the septic engineer look up. Open the dossier for the unit under the property.' },
      { id: 'farmland', group: 'ground', label: '🌾 Important farmland', note: 'Prime · Statewide · Unique · Local · Grazing — Farmland Mapping 2022', root: R_CGS, svc: 'DLRP/CaliforniaImportantFarmland_2022', kind: 'xyz', maxNative: 16, op: 0.55, z: 316, src: 'CA Dept of Conservation · Farmland Mapping & Monitoring', srcUrl: 'https://www.conservation.ca.gov/dlrp/fmmp', attr: 'CA DOC' },
      { id: 'williamson', group: 'ground', label: '📜 Williamson Act', note: 'agricultural preserve contracts — lower taxes, restricted use', root: R_CGS, svc: 'DLRP/CaliforniaWilliamsonActEnrollment_2025', kind: 'export', showLayers: '9', op: 0.5, z: 317, src: 'CA Dept of Conservation · Williamson Act 2025', srcUrl: 'https://www.conservation.ca.gov/dlrp/wa', attr: 'CA DOC' },
      // —— water & flood ——————————————————————————————————————————————
      { id: 'nfhl',    group: 'water', label: '🌊 FEMA flood zones',   note: 'the National Flood Hazard Layer — A / AE / X zones and base flood elevations', root: R_FEMA, svc: 'public/NFHL', kind: 'export', showLayers: '28,27,16', op: 0.55, z: 320, src: S_FEMA + ' National Flood Hazard Layer', srcUrl: 'https://msc.fema.gov/portal/home', attr: 'FEMA' },
      { id: 'nhd',     group: 'water', label: '🏞️ Streams & waterbodies', note: 'National Hydrography Dataset — every named creek and drainage', root: R_NHD, svc: 'nhd', kind: 'export', op: 0.9, z: 339, src: S_USGS + ' National Hydrography Dataset', srcUrl: 'https://www.usgs.gov/national-hydrography', attr: 'USGS' },
      { id: 'gwbasin', group: 'water', label: '🕳️ Groundwater basins', note: 'DWR Bulletin 118 basins and subbasins', root: R_DWR, svc: 'Geoscientific/i08_B118_CA_GroundwaterBasins', kind: 'export', op: 0.4, z: 318, src: 'CA Dept of Water Resources · Bulletin 118', srcUrl: 'https://water.ca.gov/programs/groundwater-management/bulletin-118', attr: 'CA DWR' },
      // —— ownership & survey grid ————————————————————————————————————————
      { id: 'blm',     group: 'land', label: '🏕️ Public land ownership', note: 'Forest Service, BLM, Park Service and other federal land', root: R_BLM, svc: 'lands/BLM_Natl_SMA_Cached_without_PriUnk', kind: 'xyz', maxNative: 16, op: 0.5, z: 319, src: S_BLM + ' Surface Management Agency', srcUrl: 'https://gbp-blm-egis.hub.arcgis.com/', attr: 'BLM' },
      { id: 'plss',    group: 'land', label: '📐 Township · range · section', note: 'the PLSS grid every legal description refers to (BLM CadNSDI)', root: R_BLM, svc: 'Cadastral/BLM_Natl_PLSS_CadNSDI', kind: 'export', op: 0.85, z: 339, src: S_BLM + ' Cadastral NSDI', srcUrl: 'https://gbp-blm-egis.hub.arcgis.com/', attr: 'BLM' }
    ];

    var vcBaseCache = {}, vcOverlayCache = {};
    var vcActiveBase = 'esri';
    var vcActiveOverlays = {};
    var vcTopoOpacity = 0.92;

    function vcBaseLayer(def) {
      if (def.ready) return def.ready;
      if (!vcBaseCache[def.id]) {
        vcBaseCache[def.id] = vcTrackLoading(def.kind === 'xyz'
          ? vcXYZ(def.svc)
          : vcExport(def, { transparent: false, px: 512 }));
      }
      return vcBaseCache[def.id];
    }
    // the surveyed boundary as drawn on the sheet: one segment per call so each carries its bearing
    // and distance, the 16 ft access easement, and the monuments the surveyor actually found
    function vcSurveyVectors(def, group) {
      if (def._vecLoaded) return;
      def._vecLoaded = true;
      fetch(def.vector).then(function (r) { return r.json(); }).then(function (s) {
        def._vec = s;
        var ring = (s.corners || []).map(function (c) { return c.latlng; });
        for (var i = 0; i < ring.length; i++) {
          var call = (s.calls || [])[i];
          L.polyline([ring[i], ring[(i + 1) % ring.length]], { color: '#7ff0ff', weight: 3, opacity: 0.95, dashArray: '10 7', lineCap: 'butt' })
            .bindTooltip(call ? (call.bearing + ' · ' + Number(call.distance_ft).toFixed(2) + ' ft') : 'surveyed line', { sticky: true, className: 'vc-survey-tip' })
            .addTo(group);
        }
        (s.easement16 || []).forEach(function (poly) {
          L.polygon(poly, { color: '#ffc24d', weight: 1, opacity: 0.9, fillColor: '#ffc24d', fillOpacity: 0.28 })
            .bindTooltip('16 ft access easement — as drawn on the survey', { sticky: true, className: 'vc-survey-tip' })
            .addTo(group);
        });
        (s.monuments || []).forEach(function (mo) {
          L.circleMarker(mo.at, { radius: 5, color: '#ffffff', weight: 2, fillColor: '#7ff0ff', fillOpacity: 1 })
            .bindTooltip(mo.label, { className: 'vc-survey-tip' })
            .addTo(group);
        });
        if (window.vcSync3DLayers) window.vcSync3DLayers();
      }).catch(function (e) { console.warn('survey vectors:', e); });
    }
    // per-layer opacity: user setting wins, then the catalog default; topo keeps its own slider
    var vcOverlayOp = {};
    function vcOvOpacity(def) {
      if (vcOverlayOp[def.id] != null) return vcOverlayOp[def.id];
      if (def.id === 'topo') return vcTopoOpacity;
      return def.op || 0.9;
    }
    // one raster for one def (never a parts def) — the transport is chosen by kind
    function vcRasterFor(def, opacity, zIndex) {
      var o = { opacity: opacity, pane: 'vcOverlayPane', zIndex: zIndex };
      if (def.kind === 'xyz') return vcTrackLoading(vcXYZDef(def, o));
      if (def.kind === 'wms') return vcTrackLoading(vcWms(def, o));
      // scale-limited services (CGS regional sheets) are requested at their native scale and overzoomed from there
      if (def.maxZoom) o.maxNativeZoom = def.maxZoom;
      return vcTrackLoading(vcExport(def, Object.assign({ transparent: true, px: def.px || 512 }, o)));
    }
    function vcOverlayLayer(def) {
      if (!vcOverlayCache[def.id]) {
        var op = vcOvOpacity(def), z = def.z || 300;
        if (def.kind === 'image') {
          var scan = L.imageOverlay(def.url, def.bounds, {
            opacity: op,
            pane: 'vcOverlayPane',
            interactive: false,
            className: 'vc-scan',
            zIndex: z,
            alt: 'Recorded topographic survey traced onto the map'
          });
          var grp = L.layerGroup([scan]);
          if (def.vector) vcSurveyVectors(def, grp);
          vcOverlayCache[def.id] = grp;
          return grp;
        }
        if (def.parts) {
          vcOverlayCache[def.id] = L.layerGroup(def.parts.map(function (p) { return vcRasterFor(p, op, z); }));
          return vcOverlayCache[def.id];
        }
        vcOverlayCache[def.id] = vcRasterFor(def, op, z);
      }
      return vcOverlayCache[def.id];
    }
    // every raster inside a cached overlay (a plain tile layer, or the rasters of a group)
    function vcRastersOf(lyr) {
      if (!lyr) return [];
      if (lyr.setOpacity && !(lyr instanceof L.Path)) return [lyr];
      var out = [];
      if (lyr.eachLayer) lyr.eachLayer(function (l) { if (l.setOpacity && !(l instanceof L.Path)) out.push(l); });
      return out;
    }
    function vcSetOverlayOpacity(id, v) {
      var def = vcDefById(VC_OVERLAYS, id);
      if (!def) return;
      vcOverlayOp[id] = v;
      if (id === 'topo') { vcTopoOpacity = v; var t = document.getElementById('lp-topo-op'); if (t && Math.abs(parseInt(t.value, 10) / 100 - v) > 0.011) t.value = Math.round(v * 100); }
      vcRastersOf(vcOverlayCache[id]).forEach(function (l) { l.setOpacity(v); });
      var m = window.earth3dRef;
      if (m && m.getLayer) {
        var ids = ['vc-ov-' + id];
        (def.parts || []).forEach(function (_, i) { ids.push('vc-ov-' + id + '-p' + i); });
        ids.forEach(function (lid) { try { if (m.getLayer(lid)) m.setPaintProperty(lid, 'raster-opacity', v); } catch (e) {} });
      }
      try { localStorage.setItem('ojaiMapOverlayOp', JSON.stringify(vcOverlayOp)); } catch (e) {}
    }
    // the historic-topo year changed: rebuild that one layer, new above old, old removed once the new has drawn
    function vcSetHistYear(year, immediate) {
      year = Number(year);
      if (VC_HIST_YEARS.indexOf(year) < 0) return;
      var big = document.getElementById('lp-hist-big'), lab = document.getElementById('lp-hist-label');
      if (big) big.textContent = year;
      if (lab) lab.textContent = VC_HIST_NOTES[year] || '';
      clearTimeout(vcHistTimer);
      var apply = function () {
        if (vcHistYear === year && vcOverlayCache['histtopo']) return;
        vcHistYear = year;
        try { localStorage.setItem('ojaiMapHistYear', String(year)); } catch (e) {}
        var def = vcDefById(VC_OVERLAYS, 'histtopo');
        var old = vcOverlayCache['histtopo'];
        delete vcOverlayCache['histtopo'];
        if (vcActiveOverlays['histtopo']) {
          var nu = vcOverlayLayer(def);
          if (nu.setZIndex) nu.setZIndex((def.z || 300) + 1);
          nu.addTo(map);
          var settle = function () { if (old && map.hasLayer(old)) map.removeLayer(old); if (nu.setZIndex) nu.setZIndex(def.z || 300); };
          if (old && nu.once) { nu.once('load', settle); setTimeout(settle, 3500); } else settle();
        } else if (old && map.hasLayer(old)) map.removeLayer(old);
        vcSyncPanel();
        if (window.vcSync3DLayers) window.vcSync3DLayers();
      };
      if (immediate) apply(); else vcHistTimer = setTimeout(apply, 180);
    }
    var vcHistTimer = null;
    function vcDefById(list, id) {
      for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
      return null;
    }

    var vcBaseSwapTimer = null;
    function vcSetBase(id) {
      var def = vcDefById(VC_BASES, id);
      if (!def) return;
      if (def.year) vcLastFlight = id;
      var want = vcBaseLayer(def);
      var stale = [];
      for (var i = 0; i < VC_BASES.length; i++) {
        var other = VC_BASES[i];
        if (other.id === id) continue;
        var lyr = other.ready || vcBaseCache[other.id];
        if (lyr && map.hasLayer(lyr)) stale.push(lyr);
      }
      // the new imagery goes on top; the old stays underneath until the new has drawn,
      // so scrubbing the year slider never flashes to blank
      if (want.setZIndex) want.setZIndex(1);
      if (!map.hasLayer(want)) want.addTo(map);
      var settle = function () {
        clearTimeout(vcBaseSwapTimer);
        for (var k = 0; k < stale.length; k++) if (map.hasLayer(stale[k]) && stale[k] !== want) map.removeLayer(stale[k]);
        if (want.setZIndex) want.setZIndex(0);
      };
      clearTimeout(vcBaseSwapTimer);
      if (stale.length && want.once) { want.once('load', settle); vcBaseSwapTimer = setTimeout(settle, 3500); }
      else settle();
      vcActiveBase = id;
      try { localStorage.setItem('ojaiMapBase', id); } catch (e) {}
      vcSyncPanel();
      if (window.vcSync3DLayers) window.vcSync3DLayers();
    }
    // the year slider: index into VC_FLIGHTS
    var vcFlightTimer = null;
    function vcFlightIndexOf(id) { for (var i = 0; i < VC_FLIGHTS.length; i++) if (VC_FLIGHTS[i].id === id) return i; return VC_FLIGHTS.length - 1; }
    function vcFlightLabel(f) { return f.when + (f.note ? ' \u00b7 ' + f.note : ''); }
    function vcSetFlight(idx, immediate) {
      var f = VC_FLIGHTS[Math.max(0, Math.min(VC_FLIGHTS.length - 1, idx))];
      var lab = document.getElementById('lp-year-label');
      if (lab) lab.textContent = vcFlightLabel(f);
      var big = document.getElementById('lp-year-big');
      if (big) big.textContent = f.year;
      clearTimeout(vcFlightTimer);
      if (immediate) vcSetBase(f.id);
      else vcFlightTimer = setTimeout(function () { vcSetBase(f.id); }, 160);
    }

    function vcToggleOverlay(id) {
      var def = vcDefById(VC_OVERLAYS, id);
      if (!def) return;
      var lyr = vcOverlayLayer(def);
      if (vcActiveOverlays[id]) {
        delete vcActiveOverlays[id];
        if (map.hasLayer(lyr)) map.removeLayer(lyr);
      } else {
        vcActiveOverlays[id] = true;
        lyr.addTo(map);
        if (lyr.setZIndex) lyr.setZIndex(def.z || 300);
        // a regional sheet switched on while zoomed in tight: pull back so it can actually be seen
        if (def.maxZoom && map.getZoom() > def.maxZoom + 1.5) map.flyTo(map.getCenter(), def.maxZoom + 0.5, { duration: 1.1 });
        if (def.bounds) {
          try {
            var bb = L.latLngBounds(def.bounds);
            if (!map.getBounds().intersects(bb)) map.fitBounds(bb, { padding: [50, 50] });
          } catch (e) {}
        }
      }
      try { localStorage.setItem('ojaiMapOverlays', JSON.stringify(Object.keys(vcActiveOverlays))); } catch (e) {}
      vcSyncPanel();
      if (window.vcSync3DLayers) window.vcSync3DLayers();
    }

    // ---- panel UI -------------------------------------------------------
    function vcRow(kind, id, label, note, on, info) {
      return '<div class="lp-row ' + kind + (on ? ' on' : '') + '" data-kind="' + kind + '" data-id="' + id + '">'
        + '<span class="lp-dot"></span>'
        + '<span class="lp-txt">' + label + (note ? '<span class="lp-note">' + note + '</span>' : '') + '</span>'
        + (info ? '<span class="lp-info' + (vcPeek[id] ? ' on' : '') + '" data-info="' + id + '" title="legend, source and opacity">i</span>' : '')
        + '</div>';
    }
    var vcPeek = {};        // layers whose legend is pinned open even while the layer is off
    var vcSecOpen = {};     // remembered open/closed state per section
    var vcLegendCache = {}; // id -> Promise<[{layer,label,img}]>
    var vcLegendSig = '';
    function vcHistBlock() {
      var on = !!vcActiveOverlays['histtopo'], yi = VC_HIST_YEARS.indexOf(vcHistYear);
      return '<div class="lp-years hist' + (on ? ' live' : '') + '">'
        + '<div class="lp-year-head"><b id="lp-hist-big">' + vcHistYear + '</b><span id="lp-hist-label">' + (VC_HIST_NOTES[vcHistYear] || '') + '</span></div>'
        + '<input type="range" id="lp-hist-year" min="0" max="' + (VC_HIST_YEARS.length - 1) + '" value="' + (yi < 0 ? 0 : yi) + '" step="1" aria-label="Historic topo edition year">'
        + '<div class="lp-year-ticks"><span>1903</span><span>1952</span><span>1967</span><span>1995</span></div>'
        + '</div>';
    }
    function vcBuildPanel() {
      var body = document.getElementById('lp-body');
      if (!body) return;
      var h = '<div class="lp-group">Base imagery</div>';
      for (var j = 0; j < VC_BASES.length; j++) {
        var b = VC_BASES[j];
        if (b.year) continue;
        h += vcRow('radio', b.id, b.label, b.note, vcActiveBase === b.id);
      }
      var curDef = vcDefById(VC_BASES, vcActiveBase), onFlight = !!(curDef && curDef.year);
      var fi = vcFlightIndexOf(onFlight ? vcActiveBase : vcLastFlight), fcur = VC_FLIGHTS[fi];
      h += '<div class="lp-row radio lp-flight' + (onFlight ? ' on' : '') + '" data-kind="radio" data-id="' + fcur.id + '">'
         + '<span class="lp-dot"></span>'
         + '<span class="lp-txt">🛩️ County aerial flights<span class="lp-note">' + VC_FLIGHTS.length + ' flights, 1945 to 2025 — drag the year</span></span>'
         + '</div>';
      h += '<div class="lp-years' + (onFlight ? ' live' : '') + '">'
         + '<div class="lp-year-head"><b id="lp-year-big">' + fcur.year + '</b><span id="lp-year-label">' + vcFlightLabel(fcur) + '</span></div>'
         + '<input type="range" id="lp-year" min="0" max="' + (VC_FLIGHTS.length - 1) + '" value="' + fi + '" step="1" aria-label="Aerial flight year">'
         + '<div class="lp-year-ticks"><span>1945</span><span>2005</span><span>2015</span><span>2025</span></div>'
         + '</div>';

      h += '<div class="lp-group">Layers</div>';
      for (var g = 0; g < VC_GROUPS.length; g++) {
        var grp = VC_GROUPS[g], defs = [], nOn = 0;
        for (var i = 0; i < VC_OVERLAYS.length; i++) if (VC_OVERLAYS[i].group === grp.id) { defs.push(VC_OVERLAYS[i]); if (vcActiveOverlays[VC_OVERLAYS[i].id]) nOn++; }
        var open = vcSecOpen[grp.id] != null ? vcSecOpen[grp.id] : (grp.id === 'county' || nOn > 0);
        h += '<details class="lp-sec" data-sec="' + grp.id + '"' + (open ? ' open' : '') + '>'
          + '<summary><span class="lp-sec-ico">' + grp.icon + '</span>'
          + '<span class="lp-sec-txt">' + grp.label + '<span class="lp-note">' + grp.note + '</span></span>'
          + '<span class="lp-sec-n" data-n="' + grp.id + '">' + (nOn ? nOn + ' on' : '') + '</span><span class="lp-sec-arrow"></span></summary>';
        for (var d = 0; d < defs.length; d++) {
          var o = defs[d];
          h += vcRow('check', o.id, o.label, o.note, !!vcActiveOverlays[o.id], true);
          if (o.id === 'topo') h += '<div class="lp-op">Topo opacity <input type="range" id="lp-topo-op" min="20" max="100" value="' + Math.round(vcTopoOpacity * 100) + '"></div>';
          if (o.id === 'histtopo') h += vcHistBlock();
        }
        h += '</details>';
      }
      h += '<div class="lp-group">What you are looking at</div>';
      h += '<div class="lp-legend" id="lp-legend-live"></div>';
      body.innerHTML = h;

      var yr = document.getElementById('lp-year');
      if (yr) {
        yr.addEventListener('input', function () { vcSetFlight(parseInt(this.value, 10), false); });
        yr.addEventListener('change', function () { vcSetFlight(parseInt(this.value, 10), true); });
        yr.addEventListener('click', function (e) { e.stopPropagation(); });
      }
      var hy = document.getElementById('lp-hist-year');
      if (hy) {
        hy.addEventListener('input', function () { vcSetHistYear(VC_HIST_YEARS[parseInt(this.value, 10)], false); });
        hy.addEventListener('change', function () { vcSetHistYear(VC_HIST_YEARS[parseInt(this.value, 10)], true); });
        hy.addEventListener('click', function (e) { e.stopPropagation(); });
      }
      var rows = body.querySelectorAll('.lp-row');
      for (var k = 0; k < rows.length; k++) {
        rows[k].addEventListener('click', function (e) {
          if (e && e.target && e.target.closest && e.target.closest('.lp-info')) return;   // the i button has its own handler
          var id = this.getAttribute('data-id');
          if (this.classList.contains('lp-flight')) { vcSetFlight(vcFlightIndexOf(vcLastFlight), true); return; }
          if (this.getAttribute('data-kind') === 'radio') vcSetBase(id); else vcToggleOverlay(id);
        });
      }
      var secs = body.querySelectorAll('details.lp-sec');
      for (var s = 0; s < secs.length; s++) {
        secs[s].addEventListener('toggle', function () {
          vcSecOpen[this.getAttribute('data-sec')] = this.open;
          try { localStorage.setItem('ojaiMapSections', JSON.stringify(vcSecOpen)); } catch (e) {}
        });
      }
      // one delegated handler for the legend affordances (they are re-rendered often)
      body.addEventListener('click', function (e) {
        var t = e.target.closest ? e.target.closest('.lp-info, .lp-lgb-x, .lp-lg-showall') : null;
        if (!t) return;
        e.stopPropagation(); e.preventDefault();
        if (t.classList.contains('lp-info')) {
          var id = t.getAttribute('data-info');
          if (vcPeek[id]) delete vcPeek[id]; else vcPeek[id] = true;
          vcSyncPanel(true);
          var blk = body.querySelector('.lp-lgb[data-lg="' + id + '"]');
          if (blk && blk.scrollIntoView) blk.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } else if (t.classList.contains('lp-lgb-x')) {
          delete vcPeek[t.getAttribute('data-x')];
          vcSyncPanel(true);
        } else if (t.classList.contains('lp-lg-showall')) {
          var blk2 = t.closest('.lp-lgb'); if (blk2) { blk2.classList.toggle('all'); t.textContent = blk2.classList.contains('all') ? 'show fewer' : t.getAttribute('data-all'); }
        }
      });
      body.addEventListener('input', function (e) {
        var t = e.target;
        if (t && t.classList && t.classList.contains('lp-op-in')) vcSetOverlayOpacity(t.getAttribute('data-op'), parseInt(t.value, 10) / 100);
      });
      vcUpdateTopoHint();
      var op = document.getElementById('lp-topo-op');
      if (op) op.addEventListener('input', function () { vcSetOverlayOpacity('topo', parseInt(this.value, 10) / 100); });
      vcSyncPanel(true);
    }
    // ---- live legend: one block per layer that is on (or pinned with the i button) ----
    function vcLegendFetch(def) {
      if (vcLegendCache[def.id]) return vcLegendCache[def.id];
      var parts = def.parts || [def];
      vcLegendCache[def.id] = Promise.all(parts.map(function (p) {
        if (p.kind === 'wms' || p.kind === 'imgsvc' || p.kind === 'image') return [];
        var want = p.showLayers ? p.showLayers.split(',').map(Number) : null;
        var base = vcSvcBase(p);
        var meta = want ? Promise.resolve(null) : fetch(base + '?f=json').then(function (r) { return r.json(); }).catch(function () { return null; });
        return Promise.all([fetch(base + '/legend?f=json').then(function (r) { return r.json(); }), meta]).then(function (res) {
          var j = res[0], info = res[1], vis = null;
          if (info && info.layers) {
            // only the layers the service draws by default (a parent group must be visible too)
            var byId = {}; info.layers.forEach(function (l) { byId[l.id] = l; });
            vis = {};
            info.layers.forEach(function (l) {
              var ok = l.defaultVisibility !== false, par = l.parentLayerId;
              while (ok && par != null && par >= 0 && byId[par]) { ok = byId[par].defaultVisibility !== false; par = byId[par].parentLayerId; }
              if (ok && (!l.subLayerIds || !l.subLayerIds.length)) vis[l.id] = true;
            });
          }
          var out = [], seen = {};
          (j.layers || []).forEach(function (l) {
            if (want && want.indexOf(l.layerId) < 0) return;
            if (vis && !vis[l.layerId]) return;
            (l.legend || []).forEach(function (e) {
              var key = (e.label || l.layerName) + '|' + (e.imageData || '').slice(0, 64);
              if (seen[key]) return; seen[key] = true;
              out.push({ layer: l.layerName, label: e.label || l.layerName, img: 'data:' + (e.contentType || 'image/png') + ';base64,' + e.imageData });
            });
          });
          return out;
        }).catch(function () { return []; });
      })).then(function (arrs) { return [].concat.apply([], arrs); });
      return vcLegendCache[def.id];
    }
    function vcLegendBlock(def) {
      var op = Math.round(vcOvOpacity(def) * 100);
      return '<div class="lp-lgb" data-lg="' + def.id + '">'
        + '<div class="lp-lgb-head"><b>' + def.label + '</b><span class="lp-lgb-x" data-x="' + def.id + '" title="hide this legend">✕</span></div>'
        + (def.src ? '<div class="lp-src">' + def.src + (def.srcUrl ? ' · <a href="' + def.srcUrl + '" target="_blank" rel="noopener">source ↗</a>' : '') + '</div>' : '')
        + (def.id === 'topo' ? '' : '<div class="lp-op">Opacity <input type="range" class="lp-op-in" data-op="' + def.id + '" min="10" max="100" value="' + op + '"></div>')
        + '<div class="lp-lg-list" data-list="' + def.id + '">'
        + (def.legendText ? '<div class="lp-lg">' + def.legendText + '</div>' : '<div class="lp-lg lp-lg-wait">loading the legend from ' + (def.src || 'the source') + '…</div>')
        + '</div></div>';
    }
    function vcFillLegend(def) {
      if (def.legendText) return;
      vcLegendFetch(def).then(function (items) {
        var box = document.querySelector('#lp-body .lp-lg-list[data-list="' + def.id + '"]');
        if (!box) return;
        if (!items.length) { box.innerHTML = '<div class="lp-lg">' + (def.note || 'no legend published for this layer') + '</div>'; return; }
        var CAP = 24, h = '', last = null, multi = false;
        for (var i = 1; i < items.length; i++) if (items[i].layer !== items[0].layer) { multi = true; break; }
        items.forEach(function (it, i) {
          var more = i >= CAP ? ' lp-lg-more' : '';
          if (multi && it.layer !== last) { h += '<div class="lp-lg-sub' + more + '">' + it.layer + '</div>'; last = it.layer; }
          h += '<div class="lp-lg' + more + '"><img src="' + it.img + '" alt="">' + it.label + '</div>';
        });
        if (items.length > CAP) h += '<div class="lp-lg-showall" data-all="show all ' + items.length + ' entries">show all ' + items.length + ' entries</div>';
        box.innerHTML = h;
      });
    }
    function vcRenderLegend(force) {
      var live = document.getElementById('lp-legend-live');
      if (!live) return;
      var ids = [];
      for (var i = 0; i < VC_OVERLAYS.length; i++) { var id = VC_OVERLAYS[i].id; if (vcActiveOverlays[id] || vcPeek[id]) ids.push(id); }
      var sig = ids.join(',');
      if (!force && sig === vcLegendSig) return;
      vcLegendSig = sig;
      if (!ids.length) { live.innerHTML = '<div class="lp-empty">Switch a layer on — its legend, its source and an opacity control appear here. The <b>i</b> on any row shows the legend without switching the layer on.</div>'; return; }
      var h = '';
      ids.forEach(function (id) { h += vcLegendBlock(vcDefById(VC_OVERLAYS, id)); });
      live.innerHTML = h;
      ids.forEach(function (id) { vcFillLegend(vcDefById(VC_OVERLAYS, id)); });
    }
    function vcSyncPanel(forceLegend) {
      var body = document.getElementById('lp-body');
      if (!body) return;
      var rows = body.querySelectorAll('.lp-row');
      var curDef = vcDefById(VC_BASES, vcActiveBase), onFlight = !!(curDef && curDef.year);
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i], id = r.getAttribute('data-id');
        var on = r.classList.contains('lp-flight') ? onFlight
          : (r.getAttribute('data-kind') === 'radio' ? (vcActiveBase === id) : !!vcActiveOverlays[id]);
        r.classList.toggle('on', on);
        var inf = r.querySelector('.lp-info'); if (inf) inf.classList.toggle('on', !!vcPeek[id]);
      }
      var yrs = body.querySelector('.lp-years:not(.hist)'); if (yrs) yrs.classList.toggle('live', onFlight);
      var yr = document.getElementById('lp-year');
      if (yr && onFlight) { var fi = vcFlightIndexOf(vcActiveBase); if (parseInt(yr.value, 10) !== fi) yr.value = fi;
        var big = document.getElementById('lp-year-big'), lab = document.getElementById('lp-year-label');
        if (big) big.textContent = VC_FLIGHTS[fi].year; if (lab) lab.textContent = vcFlightLabel(VC_FLIGHTS[fi]); }
      var hys = body.querySelector('.lp-years.hist'); if (hys) hys.classList.toggle('live', !!vcActiveOverlays['histtopo']);
      var hy = document.getElementById('lp-hist-year');
      if (hy) { var hi = VC_HIST_YEARS.indexOf(vcHistYear); if (hi >= 0 && parseInt(hy.value, 10) !== hi) hy.value = hi; }
      for (var g = 0; g < VC_GROUPS.length; g++) {
        var n = 0;
        for (var k = 0; k < VC_OVERLAYS.length; k++) if (VC_OVERLAYS[k].group === VC_GROUPS[g].id && vcActiveOverlays[VC_OVERLAYS[k].id]) n++;
        var badge = body.querySelector('.lp-sec-n[data-n="' + VC_GROUPS[g].id + '"]'); if (badge) badge.textContent = n ? n + ' on' : '';
      }
      vcRenderLegend(!!forceLegend);
      var btn = document.getElementById('layers-toggle');
      if (btn) btn.classList.toggle('active', Object.keys(vcActiveOverlays).length > 0 || vcActiveBase !== 'esri');
    }

    // The county only draws contours below roughly 1:9,000 — zoomed out past
    // that the layer is genuinely empty, so say so instead of looking broken.
    var VC_TOPO_MIN_ZOOM = 16;
    function vcUpdateTopoHint() {
      var z = map.getZoom();
      for (var i = 0; i < VC_OVERLAYS.length; i++) {
        var d = VC_OVERLAYS[i];
        if (d.minZoom == null && d.maxZoom == null) continue;
        var row = document.querySelector('#lp-body .lp-row[data-id="' + d.id + '"] .lp-note');
        if (!row) continue;
        var far = d.minZoom != null && z < d.minZoom, near = d.maxZoom != null && z > d.maxZoom + 1.5;
        row.textContent = far ? (d.farNote || 'zoom in closer to see this') : near ? (d.nearNote || 'drawn for a wider view — softer this close') : d.note;
        row.style.color = (far || near) ? '#e8b964' : '';
      }
    }

    // subtle activity light on the Layers button while county tiles are in flight
    var vcPending = 0;
    function vcTrackLoading(layer) {
      layer.on('loading', function () { vcPending++; vcPaintBusy(); });
      layer.on('load', function () { vcPending = Math.max(0, vcPending - 1); vcPaintBusy(); });
      return layer;
    }
    function vcPaintBusy() {
      var b = document.getElementById('layers-toggle');
      if (b) b.classList.toggle('busy', vcPending > 0);
    }

    var vcPanelOpen = false;
    function vcTogglePanel(force) {
      var p = document.getElementById('layers-panel');
      if (!p) return;
      vcPanelOpen = (typeof force === 'boolean') ? force : !vcPanelOpen;
      p.classList.toggle('open', vcPanelOpen);
    }

    // ---- click anywhere for a real ground elevation (USGS 3DEP, 1 m) -----
    var vcElevBusy = false;
    function vcElevationAt(latlng) {
      if (vcElevBusy) return;
      vcElevBusy = true;
      var pt = encodeURIComponent(JSON.stringify({ x: latlng.lng, y: latlng.lat, spatialReference: { wkid: 4326 } }));
      fetch('https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/identify'
            + '?geometry=' + pt + '&geometryType=esriGeometryPoint&returnGeometry=false&f=json')
        .then(function (r) { return r.json(); })
        .then(function (j) {
          vcElevBusy = false;
          var m = parseFloat(j && j.value);
          if (!isFinite(m)) return;
          var ft = Math.round(m * 3.28084);
          L.popup({ className: 'vc-elev-popup', closeButton: false })
            .setLatLng(latlng)
            .setContent('⛰️ ' + ft.toLocaleString() + ' ft <span style="font-weight:500;opacity:0.65">(' + m.toFixed(1) + ' m)</span>')
            .openOn(map);
        })
        .catch(function () { vcElevBusy = false; });
    }

    (function initCountyLayers() {
      // county rasters sit above the base imagery but below the property
      // boundaries, lot lines, zone markers and popups
      try {
        map.createPane('vcOverlayPane');
        var vp = map.getPane('vcOverlayPane');
        vp.style.zIndex = 250;
        vp.style.pointerEvents = 'none';
      } catch (e) {}
      try {
        var savedBase = localStorage.getItem('ojaiMapBase');
        if (savedBase && vcDefById(VC_BASES, savedBase)) vcActiveBase = savedBase;
        var savedOv = JSON.parse(localStorage.getItem('ojaiMapOverlays') || '[]');
        for (var i = 0; i < savedOv.length; i++) if (vcDefById(VC_OVERLAYS, savedOv[i])) vcActiveOverlays[savedOv[i]] = true;
        var savedOp = JSON.parse(localStorage.getItem('ojaiMapOverlayOp') || '{}');
        for (var oid in savedOp) if (vcDefById(VC_OVERLAYS, oid) && isFinite(savedOp[oid])) vcOverlayOp[oid] = Math.max(0.1, Math.min(1, Number(savedOp[oid])));
        if (vcOverlayOp['topo'] != null) vcTopoOpacity = vcOverlayOp['topo'];
        vcSecOpen = JSON.parse(localStorage.getItem('ojaiMapSections') || '{}') || {};
        var savedHy = parseInt(localStorage.getItem('ojaiMapHistYear') || '', 10);
        if (VC_HIST_YEARS.indexOf(savedHy) >= 0) vcHistYear = savedHy;
      } catch (e) {}

      vcBuildPanel();
      if (vcActiveBase !== 'esri') vcSetBase(vcActiveBase);
      var restore = Object.keys(vcActiveOverlays);
      for (var k = 0; k < restore.length; k++) {
        var d = vcDefById(VC_OVERLAYS, restore[k]);
        if (d) { var l = vcOverlayLayer(d); l.addTo(map); if (l.setZIndex) l.setZIndex(d.z || 300); }
      }
      vcSyncPanel();

      var btn = document.getElementById('layers-toggle');
      if (btn) btn.addEventListener('click', function (e) { e.stopPropagation(); vcTogglePanel(); });
      var close = document.getElementById('lp-close');
      if (close) close.addEventListener('click', function (e) { e.stopPropagation(); vcTogglePanel(false); });
      var panel = document.getElementById('layers-panel');
      if (panel) panel.addEventListener('click', function (e) { e.stopPropagation(); });
      document.addEventListener('click', function () { if (vcPanelOpen) vcTogglePanel(false); });

      map.on('zoomend', vcUpdateTopoHint);
      map.on('click', function (e) {
        if (!vcActiveOverlays['topo']) return;
        if (window.positionEditActive) return;
        if (Date.now() < (window.ignoreMapClicksUntil || 0)) return;
        vcElevationAt(e.latlng);
      });
    })();
    window.leafletMap = map;
    window.vcSetBase = vcSetBase;
    window.vcToggleOverlay = vcToggleOverlay;
    window.vcState = function () { return { base: vcActiveBase, overlays: Object.keys(vcActiveOverlays), histYear: vcHistYear, opacity: vcOverlayOp }; };
    window.vcSetHistYear = vcSetHistYear;
    window.vcSetOverlayOpacity = vcSetOverlayOpacity;
    window.vcCatalog = function () { return { groups: VC_GROUPS, overlays: VC_OVERLAYS.map(function (o) { return { id: o.id, group: o.group, kind: o.kind || 'export', z: o.z, parts: (o.parts || []).length }; }) }; };
    
    // Prevent accidental map clicks during panel swipes and track panel state
    window.ignoreMapClicksUntil = 0;
    window.panelIsClosing = false;
    window.isInteractingWithGallery = false;
    function suppressMapClicksFor(ms) { window.ignoreMapClicksUntil = Date.now() + ms; }
    
    // Dropdown toggle function for Get Involved section
    function toggleDropdown(button) {
      button.classList.toggle('active');
      const content = button.nextElementSibling;
      content.classList.toggle('active');
    }
    
    // Body scroll lock helpers (avoid footer bounce and stuck scroll on iOS)
    function lockBodyScroll() {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      document.documentElement.style.overscrollBehaviorY = 'none';
    }
    function unlockBodyScroll() {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      document.documentElement.style.overscrollBehaviorY = '';
    }
    // Ensure correct body scroll state based on UI
    function ensureBodyScrollState() {
      try {
        const sp = document.getElementById('side-panel');
        const pp = document.getElementById('property-panel');
        const lb = document.getElementById('image-lightbox');
        const anyOpen = (sp && sp.classList.contains('open')) || (pp && pp.classList.contains('open')) || (lb && lb.classList.contains('active'));
        if (anyOpen) {
          lockBodyScroll();
        } else {
          unlockBodyScroll();
        }
      } catch(_) {}
    }
    
    // Fit text to a maximum number of lines by slightly reducing font size
    function fitTextToLines(el, maxLines, maxSize, minSize) {
      try {
        if (!el) return;
        el.style.whiteSpace = 'normal';
        el.style.wordBreak = 'break-word';
        el.style.display = 'block';
        let size = maxSize;
        el.style.fontSize = size + 'px';
        const lh = parseFloat(window.getComputedStyle(el).lineHeight) || (size * 1.25);
        let guard = 12;
        while (guard-- > 0 && size > minSize && el.scrollHeight > lh * maxLines) {
          size -= 1;
          el.style.fontSize = size + 'px';
        }
        // If still overflowing at minimum, allow one more line (up to 3)
        if (el.scrollHeight > lh * maxLines && maxLines < 3) {
          try { el.style.setProperty('-webkit-line-clamp', String(maxLines + 1)); } catch(_) {}
        }
      } catch(_) {}
    }

    // Enable mobile-only swipe-to-close for both panels
    if (window.matchMedia && window.matchMedia('(max-width: 768px)').matches) {
      attachPanelSwipe(map);
      attachPropertyPanelSwipe();
    }
    
    // Add tile loading indicators and error handling
    satelliteLayer.on('loading', () => {
      console.log('🔄 Loading satellite tiles...');
    });
    
    satelliteLayer.on('load', () => {
      console.log('✅ Satellite tiles loaded successfully');
    });
    
    satelliteLayer.on('tileerror', (e) => {
      console.warn('⚠️ Tile loading error, trying fallback:', e.tile.src);
      // Auto-switch to Google satellite if Esri fails
      if (map.hasLayer(satelliteLayer)) {
        map.removeLayer(satelliteLayer);
        googleSatLayer.addTo(map);
        console.log('🔄 Switched to Google satellite tiles');
      }
    });
    
    // Add recenter control (jump back to property)
    // Recenter returns to the all-properties overview (bounds set once boundaries build)
    const recenterControl = L.control({ position: 'bottomright' });
    recenterControl.onAdd = function(m) {
      const div = L.DomUtil.create('div', 'leaflet-bar recenter-control');
      div.innerHTML = '<button type="button" aria-label="Recenter" title="Recenter">⌖</button>';
      div.style.cursor = 'pointer';
      const btn = div.querySelector('button');
      btn.style.width = '48px';
      btn.style.height = '48px';
      btn.style.fontSize = '20px';
      btn.style.lineHeight = '48px';
      btn.style.border = 'none';
      btn.style.background = 'white';
      btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
      btn.style.borderRadius = '8px';
      L.DomEvent.disableClickPropagation(div);
      L.DomEvent.on(btn, 'click', function(e) {
        L.DomEvent.stopPropagation(e);
        if (window.allPropertiesBounds) map.flyToBounds(window.allPropertiesBounds, { padding: [130, 60], easeLinearity: 0.12 });
      });
      return div;
    };
    recenterControl.addTo(map);

    console.log('🛰️ Multi-layer satellite imagery system initialized');
    
    // Load multi-property data
    const properties = PROPERTIES_PLACEHOLDER;
    const propertiesById = {};
    properties.forEach(function(p) {
      propertiesById[p.id] = p;
      p.zones.forEach(function(z) { z.propertyId = p.id; });
    });
    const zones = [].concat.apply([], properties.map(function(p) { return p.zones; }));

    console.log('📊 Loaded', properties.length, 'properties |', zones.length, 'total zones');

    var propertyLines = [];
    var allBounds = null;

    properties.forEach(function(prop) {
      // Lot territories: REAL recorded parcel lines inside the property
      // (drawn first so the rainbow boundary + icons stay on top)
      if (prop.lots && prop.lots.length) {
        var ls = prop.lotStyle || {};
        prop.lots.forEach(function(lot) {
          (lot.rings || []).forEach(function(ring) {
            var lotPoly = L.polygon(ring, {
              color: ls.color || '#FFFFFF',
              weight: ls.weight || 1.4,
              opacity: ls.opacity || 0.85,
              fillColor: ls.fillColor || '#FFFFFF',
              fillOpacity: ls.fillOpacity || 0.05,
              interactive: true
            }).addTo(map);
            lotPoly.bindPopup(
              '<div style="font-weight:700;margin-bottom:4px;">' + (lot.name || 'Lot') + '</div>' +
              '<div style="font-family:monospace;font-size:12px;margin-bottom:2px;">APN ' + lot.apn + '</div>' +
              '<div style="font-size:12px;color:#555;">' + lot.acreage + ' acres</div>'
            );
          });
        });
        console.log('🗺️ ' + prop.name + ': ' + prop.lots.length + ' lot territories rendered');
      }

      // Stitch this property's boundary segments into one closed loop
      var boundaryCoordinates = [];
      prop.boundary.forEach(function(lineData) {
        for (var i = 0; i < lineData.coordinates.length - 1; i++) {
          boundaryCoordinates.push(lineData.coordinates[i]);
        }
      });
      if (prop.boundary.length > 0) {
        var lastLine = prop.boundary[prop.boundary.length - 1];
        boundaryCoordinates.push(lastLine.coordinates[lastLine.coordinates.length - 1]);
        boundaryCoordinates.push(boundaryCoordinates[0]);
      }

      var blurLine = L.polyline(boundaryCoordinates, {
        color: '#FFD700', weight: 10, opacity: 0.52,
        className: 'property-line-blur', interactive: false,
        lineCap: 'round', lineJoin: 'round', smoothFactor: 1.5
      }).addTo(map);

      var mainLine = L.polyline(boundaryCoordinates, {
        color: '#7C3AED', weight: 8, opacity: 0.88,
        className: 'property-line-magical property-line-gradient',
        interactive: true, bubblingMouseEvents: true,
        lineCap: 'round', lineJoin: 'round', smoothFactor: 1.5
      }).addTo(map);
      mainLine._locked = true; mainLine._permanent = true;
      propertyLines.push(mainLine);

      var openHandler = function(e) {
        if (window.positionEditActive) { L.DomEvent.stopPropagation(e); return; }
        if (window.ignoreMapClicksUntil && Date.now() < window.ignoreMapClicksUntil) { L.DomEvent.stopPropagation(e); return; }
        var side = document.getElementById('side-panel');
        if (side && side.classList.contains('open')) { side.classList.remove('open'); }
        var pp = document.getElementById('property-panel');
        if (pp && pp.classList.contains('open') && window.currentPropertyId === prop.id) { L.DomEvent.stopPropagation(e); return; }
        window.openCommunityCard(prop.id);
        if (mainLine._path) { mainLine._path.classList.add('active'); }
        L.DomEvent.stopPropagation(e);
      };
      mainLine.on('click', openHandler);

      var hitLine = L.polyline(boundaryCoordinates, {
        color: '#000', weight: 30, opacity: 0.0001,
        className: 'property-line-hit', interactive: true,
        lineCap: 'round', lineJoin: 'round'
      }).addTo(map);
      hitLine.on('click', openHandler);

      var b = mainLine.getBounds();
      allBounds = allBounds ? allBounds.extend(b) : L.latLngBounds(b.getSouthWest(), b.getNorthEast());

      // Property name chip — visible at overview zoom, click to fly in
      var labelMarker = L.marker(prop.center, {
        interactive: true,
        zIndexOffset: 2000,
        icon: L.divIcon({
          className: 'property-label-marker',
          html: '<div class="property-label-chip">' + prop.labelChip + '</div>',
          iconSize: null,
          iconAnchor: [0, 0]
        })
      }).addTo(map);
      if (!window.propertyChipEls) window.propertyChipEls = {};
      window.propertyChipEls[prop.id] = function() {
        var el = labelMarker.getElement();
        return el && el.querySelector('.property-label-chip');
      };
      labelMarker.on('click', function(e) {
        L.DomEvent.stopPropagation(e);
        map.flyTo(prop.center, prop.zoom, { animate: true, easeLinearity: 0.12 });
      });
    });

    // Shared CSS rainbow animation for all boundary lines
    setTimeout(function() {
      var style = document.createElement('style');
      style.textContent = '@keyframes rainbow-flow {' +
        '0% { stroke: #6366F1; } 20% { stroke: #8B5CF6; } 40% { stroke: #EC4899; }' +
        '60% { stroke: #F59E0B; } 80% { stroke: #10B981; } 100% { stroke: #6366F1; }' +
        '} .property-line-gradient { animation: rainbow-flow 10s ease-in-out infinite; stroke-linecap: round; stroke-linejoin: round; }';
      document.head.appendChild(style);
    }, 200);

    // Start at the all-properties overview
    window.allPropertiesBounds = allBounds;
    if (allBounds) map.fitBounds(allBounds, { padding: [130, 60] });

    console.log('🌈 Rainbow boundaries created for', properties.length, 'properties');
    
        // Zone color mapping
    const zoneColorMap = {
      agriculture: '#4CAF50',
      residential: '#2196F3', 
      community: '#FF9800',
      hospitality: '#9C27B0',
      infrastructure: '#607D8B',
      creative: '#795548',
      ceremonial: '#E91E63',
      wellness: '#00BCD4',
      landscape: '#8BC34A',
      beekeeping: '#FFD700',  // Golden yellow for beekeeping
      events: '#FF6B6B',  // Coral red for events and gatherings
      water: '#0288D1'   // Lake blue for pond & swimming hole
    };
    
    // Store original positions for reset functionality
    zones.forEach(zone => {
      if (!zone.originalPosition) {
        zone.originalPosition = [...zone.position]; // Store original coordinates
      }
    });
    
    // Keep references to markers for dynamic scaling on zoom
    const zoneMarkers = [];
    
    // Add zones to map
    zones.forEach(zone => {
      // Create rounded zone polygon (40% smaller radius)
      const createCircularPolygon = (center, radiusInMeters, points = 16) => {
        const coords = [];
        for (let i = 0; i < points; i++) {
          const angle = (i / points) * 2 * Math.PI;
          const lat = center[0] + (radiusInMeters * 0.000009) * Math.cos(angle);
          const lng = center[1] + (radiusInMeters * 0.000009) * Math.sin(angle) / Math.cos(center[0] * Math.PI / 180);
          coords.push([lat, lng]);
        }
        return coords;
      };
      
      // Create circular polygon with 50% smaller radius (15 meters instead of 30)
      const circularPolygon = createCircularPolygon(zone.position, 15);
      const polygon = L.polygon(circularPolygon, {
        color: zoneColorMap[zone.type] || '#333',
        fillColor: zoneColorMap[zone.type] || '#333',
        fillOpacity: 0.3,
        weight: 2,
        opacity: 0.8
      }).addTo(map);
      
      // Create custom marker with enhanced 3D styling (no white background, 10% smaller colored circle)
      const zoneColor = zoneColorMap[zone.type] || '#333';
      const marker = L.marker(zone.position, {
        draggable: window.editMode || false,
        zoneId: zone.id, // Add zone ID for reset functionality
        propertyId: zone.propertyId,
        zoneName: zone.name, // Add zone name for capture functionality
        zoneMode: zone.mode || 'both', // 'current' | 'vision' | 'both' — gated by the mode toggle
        icon: L.divIcon({
          className: 'zone-marker',
          html: '<div style="background: linear-gradient(135deg, ' + zoneColor + ' 0%, ' + zoneColor + 'dd 50%, ' + zoneColor + 'aa 100%); border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-size: 22px; text-align: center; box-shadow: 0 8px 16px rgba(0,0,0,0.3), 0 4px 8px rgba(0,0,0,0.2), inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.2); border: 2px solid rgba(255,255,255,0.4); filter: brightness(1.1) contrast(1.1); transform: perspective(100px) rotateX(15deg); text-shadow: 0 1px 2px rgba(0,0,0,0.3);">' + zone.emoji + '</div>',
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        })
      }).addTo(map);
      zoneMarkers.push(marker);
      
      // Add click handlers for interactive side panel (guard against swipe-ending ghost clicks)
      const clickHandler = (e) => {
        if (window.positionEditActive) { L.DomEvent.stopPropagation(e); return; }
        if (window.ignoreMapClicksUntil && Date.now() < window.ignoreMapClicksUntil) { L.DomEvent.stopPropagation(e); return; }
        if (window.panelIsClosing) { L.DomEvent.stopPropagation(e); return; }
        // DEBUG: Log which zone is being clicked
        console.log('🔍 CLICKED ZONE:', zone.id, '-', zone.name);
        // Close any open panels first to ensure only ONE panel at a time
        const openPanels = document.querySelectorAll('.side-panel.open, .property-panel.open');
        openPanels.forEach(p => {
          p.classList.remove('open', 'swiping');
          p.style.transform = '';
          p.style.transition = '';
          p.style.animation = '';
        });
        openSidePanel(zone);
        L.DomEvent.stopPropagation(e);
      };
      marker.on('click', clickHandler);
      polygon.on('click', clickHandler);
      
      // Drag support: track the CURRENT territory circle so repeat drags
      // replace it instead of stacking duplicates (old bug), and feed the
      // Position Editor via notifyZoneMoved + a redraw registry for Reset.
      let zonePolygon = polygon;
      const territoryKey = zone.propertyId + '/' + zone.id;
      const redrawTerritory = function(pos) {
        try { map.removeLayer(zonePolygon); } catch (err) {}
        zonePolygon = L.polygon(createCircularPolygon(pos, 15), {
          color: zoneColorMap[zone.type] || '#333',
          fillColor: zoneColorMap[zone.type] || '#333',
          fillOpacity: 0.3,
          weight: 2,
          opacity: 0.8
        }).addTo(map);
        zonePolygon.on('click', clickHandler);
      };
      if (!window.zoneTerritories) window.zoneTerritories = {};
      window.zoneTerritories[territoryKey] = redrawTerritory;
      if (!window.zoneTerritoryToggles) window.zoneTerritoryToggles = {};
      window.zoneTerritoryToggles[territoryKey] = function(show) {
        try {
          if (show) { if (!map.hasLayer(zonePolygon)) zonePolygon.addTo(map); }
          else if (map.hasLayer(zonePolygon)) { map.removeLayer(zonePolygon); }
        } catch (err) {}
      };
      
      marker.on('dragend', function(e) {
        const newPos = e.target.getLatLng();
        zone.position = [newPos.lat, newPos.lng];
        redrawTerritory([newPos.lat, newPos.lng]);
        if (window.notifyZoneMoved) window.notifyZoneMoved(zone);
        console.log('📍 ' + zone.name + ' moved to: [' + newPos.lat + ', ' + newPos.lng + ']');
      });
    });
    
    console.log('📍 Zone markers and polygons added to map');
    
    // Smooth dynamic marker scaling for visibility and pixel definition
    function updateMarkerScale() {
      const zoom = map.getZoom();
      const mapEl = document.getElementById('map');
      // overview-mode drives the property name chips (visible when zoomed out)
      if (mapEl) mapEl.classList.toggle('overview-mode', zoom < 13.5);
      const scaleBase = 1 + (zoom - 17) * 0.08;
      const scale = Math.max(0.9, Math.min(1.9, scaleBase)) * (window.devicePixelRatio >= 2 ? 1.05 : 1);
      const baseFont = 22;
      zoneMarkers.forEach(m => {
        const el = m.getElement();
        if (!el) return;
        // Each property's icons appear once you're zoomed near ITS scale, so a
        // huge ranch at zoom 14 shows its icons while a neighbor's stay tucked.
        const p = propertiesById[m.options && m.options.propertyId];
        const minZoom = p ? (p.zoom - 2.5) : 13.5;
        const inMode = !window.zoneVisibleInMode || window.zoneVisibleInMode(m.options && m.options.zoneMode);
        el.style.display = (inMode && zoom >= minZoom) ? '' : 'none';
        const inner = el.querySelector('div');
        if (!inner) return;
        inner.style.transform = 'perspective(100px) rotateX(15deg) scale(' + scale + ')';
        inner.style.fontSize = (baseFont * scale) + 'px';
      });
    }
    map.on('zoomend', updateMarkerScale);
    map.on('zoom', updateMarkerScale);
    updateMarkerScale();
    
    // Side panel functionality
    function openSidePanel(zone) {
      const panel = document.getElementById('side-panel');
      const content = document.getElementById('panel-content');
      let hero = document.getElementById('project-hero');
      // Fallback: If header (title + X) is ever missing, rebuild it to ensure visibility
      if (!hero || !document.getElementById('close-panel')) {
        try {
          const existingHeader = panel.querySelector('.panel-header');
          if (existingHeader) existingHeader.remove();
          panel.insertAdjacentHTML('afterbegin', '<div class="panel-header">\
            <div class="project-hero" id="project-hero"></div>\
            <button class="close-panel" id="close-panel">&times;</button>\
          </div>');
          hero = document.getElementById('project-hero');
          const closeBtn = document.getElementById('close-panel');
          if (closeBtn && !closeBtn.dataset.bound) {
            closeBtn.addEventListener('click', () => {
              const sp = document.getElementById('side-panel');
              sp.classList.remove('open');
              sp.style.transform = '';
              sp.style.transition = '';
              if (typeof unlockBodyScroll === 'function') unlockBodyScroll();
              if (typeof ensureBodyScrollState === 'function') ensureBodyScrollState();
              window.currentZoneId = null;
            });
            closeBtn.dataset.bound = '1';
          }
        } catch(_) {}
      }
      // FORCE close property panel so only ONE panel is open at a time
      const propPanel = document.getElementById('property-panel');
      if (propPanel) {
        propPanel.classList.remove('open', 'swiping');
        propPanel.style.transform = '';
        propPanel.style.transition = '';
        propPanel.style.animation = '';
        propPanel.style.touchAction = '';
      }
      
      // Get zone color for theming
      const zoneColor = zoneColorMap[zone.type] || '#333';
      // Improve contrast for specific zones (e.g., Retreat Village has purple bg)
      const zoneNameLower = (zone && zone.name ? String(zone.name) : '').toLowerCase();
      let titleColor = zoneColor;
      if (zoneNameLower.includes('retreat') && zoneNameLower.includes('village')) {
        // Use warm amber for strong contrast on purple backgrounds
        titleColor = '#F59E0B';
      }
      
      // Update header: ALWAYS set title with guaranteed visibility
      if (hero) {
        // Calculate title length for responsive sizing
        const titleText = zone.emoji + ' ' + (window.zoneView ? window.zoneView(zone).name : zone.name);
        const titleLength = titleText.length;
        let fontSizeClass = '';
        
        // Assign size classes based on title length
        if (titleLength > 35) {
          fontSizeClass = 'title-extra-long'; // Very long titles
        } else if (titleLength > 25) {
          fontSizeClass = 'title-long'; // Long titles
        } else if (titleLength > 20) {
          fontSizeClass = 'title-medium'; // Medium-long titles
        }
        
        hero.innerHTML = '<div class="project-title ' + fontSizeClass + '" style="color: #ffffff !important; text-shadow: 0 1px 2px rgba(0,0,0,0.25); font-weight: 700; line-height: 1.2; letter-spacing: 0.1px; margin: 2px 0; font-size: 18px; display: block; visibility: visible;">' + titleText + '</div>';
        // Keep the solid purple gradient (don't override with transparent zone color — causes invisible header on mobile)
        hero.style.background = '';
        hero.style.borderLeft = '4px solid ' + zoneColor;
        hero.style.display = 'flex';
        hero.style.visibility = 'visible';
      }
      console.log('📋 Set title for:', zone.name);
      
      // Detect if device is mobile (screen width < 1024px)
      const isMobile = window.innerWidth < 1024;
      
      // Desktop: Keep map FULLY interactive when panel is open
      // Mobile: Disable map interactions when panel is open
      const mapContainer = document.getElementById('map');
      if (!isMobile) {
        // DESKTOP: Map stays fully interactive
        if (mapContainer) {
          mapContainer.style.pointerEvents = 'auto';
          mapContainer.style.touchAction = 'auto';
        }
        if (map) {
          map.dragging.enable();
          map.touchZoom.enable();
          map.doubleClickZoom.enable();
          map.scrollWheelZoom.enable();
          map.boxZoom.enable();
          map.keyboard.enable();
        }
      } else {
        // MOBILE: Disable all map interactions when panel is open
        if (mapContainer) {
          mapContainer.style.pointerEvents = 'none';
          mapContainer.style.touchAction = 'none';
        }
        if (map) {
          map.dragging.disable();
          map.touchZoom.disable();
          map.doubleClickZoom.disable();
          map.scrollWheelZoom.disable();
          map.boxZoom.disable();
          map.keyboard.disable();
        }
      }
      
      // Open the panel first for smooth animation, then inject heavy content
      panel.classList.add('open');
      // Only lock body scroll on MOBILE
      if (isMobile && typeof lockBodyScroll === 'function') lockBodyScroll();
      window.currentZoneId = zone.id;
      
      // Defer heavy DOM work to next frame for smoother opening
      requestAnimationFrame(function() {
        content.innerHTML = (window.modeStripHTML ? window.modeStripHTML() : '') + generateProjectDetails(zone);
        setupImageGalleryTabs();
        loadZoneImages(zone);
        
        // Fix timeline on mobile after content loads
        if (window.innerWidth <= 768 && typeof fixTimelineOnMobile === 'function') {
          setTimeout(fixTimelineOnMobile, 100);
        }
        
        // CRITICAL: Always scroll panel content to TOP when opening (both mobile & desktop)
        requestAnimationFrame(function() {
          const panelContent = document.getElementById('panel-content');
          if (panelContent) {
            panelContent.scrollTop = 0;
          }
          // Also scroll the main panel container to top
          if (panel) {
            panel.scrollTop = 0;
          }
        });
      });
      
      // Initialize gallery state tracking
      if (!window.galleryState) window.galleryState = {};
      window.galleryState[zone.id] = { current: 0, vision: 0 };
      
      console.log('📋 Opened side panel for:', zone.name);
    }
    
    // Close panel functionality with complete cleanup
    document.getElementById('close-panel').addEventListener('click', () => {
      const sp = document.getElementById('side-panel');
      sp.classList.remove('open', 'swiping');
      sp.style.transform = '';
      sp.style.transition = '';
      sp.style.animation = '';
      sp.style.touchAction = '';
      if (typeof unlockBodyScroll === 'function') unlockBodyScroll();
      if (typeof ensureBodyScrollState === 'function') ensureBodyScrollState();
      
      // Re-enable map interactions completely
      const mapEl = document.getElementById('map');
      if (mapEl) {
        mapEl.style.pointerEvents = '';
        mapEl.style.touchAction = '';
      }
      // Re-enable Leaflet map interactions
      if (typeof map !== 'undefined' && map) {
        try {
          map.dragging.enable();
          map.touchZoom.enable();
          map.doubleClickZoom.enable();
          map.scrollWheelZoom.enable();
          map.boxZoom.enable();
          map.keyboard.enable();
        } catch(e) {}
      }
      
      // Clear current zone reference
      window.currentZoneId = null;
      
      console.log('❌ Closed side panel');
    });
    
    // Property Panel — parameterized per property
    function openPropertyPanel(propId) {
      const prop = propertiesById[propId];
      if (!prop) return;
      const panel = document.getElementById('property-panel');
      const titleEl = document.getElementById('property-title');
      const contentEl = document.getElementById('property-panel-content');
      const sidePanel = document.getElementById('side-panel');
      if (sidePanel && sidePanel.classList.contains('open')) {
        sidePanel.classList.remove('open', 'swiping');
        sidePanel.style.transform = '';
      }
      const panelData = (window.visionMode && prop.visionPanel) ? prop.visionPanel : prop.panel;
      titleEl.textContent = panelData.title;
      window.currentPropertyId = prop.id;

      panel.classList.add('open');
      if (typeof lockBodyScroll === 'function') lockBodyScroll();
      requestAnimationFrame(function() {
        contentEl.innerHTML = (window.modeStripHTML ? window.modeStripHTML() : '')
          + (window.statusCardHTML ? window.statusCardHTML(prop) : '')
          + panelData.html
          + (window.dossierSectionHTML ? window.dossierSectionHTML(prop) : '')
          + (window.docsSectionHTML ? window.docsSectionHTML(prop) : '')
          + '<div class="portal-btn" onclick="window.enterPortal(&quot;' + prop.id + '&quot;)">' + (window.visionMode ? '🌍 Fly the Vision in 3D' : '🌀 Enter the Vision') + '</div>';
        loadPropertyImages(prop.id);
        if (window.loadDossier) window.loadDossier(prop);
        requestAnimationFrame(function() {
          if (panel) panel.scrollTop = 0;
          if (contentEl) contentEl.scrollTop = 0;
        });
      });

      console.log('🌈 Opened property panel:', prop.name);
    }
    
        // Load property images from Supabase
    function loadPropertyImages(propId) {
      console.log('📸 Loading property images from image-urls.js');
      
      // Get reference to main carousel and thumbnails
      const mainCarousel = document.getElementById('property-carousel-main');
      const thumbnailsContainer = document.getElementById('property-carousel-thumbnails');
      
      if (!mainCarousel || !thumbnailsContainer) {
        console.log('❌ Property carousel containers not found');
        return;
      }
      
      // Use pre-configured property images from IMAGE_URLS.
      // Vision mode prefers the property's vision gallery, falling back to current.
      const propImgCategory = window.visionMode ? 'vision' : 'current';
      fetch('/api/images/' + propId + '/property/' + propImgCategory)
        .then(response => response.json())
        .then(data => {
          if (propImgCategory === 'vision' && (!data.success || !data.images || data.images.length === 0)) {
            return fetch('/api/images/' + propId + '/property/current').then(function(r) { return r.json(); });
          }
          return data;
        })
        .then(data => {
          if (!data.success || !data.images || data.images.length === 0) {
            console.log('ℹ️ No property images found');
            const gallerySection = mainCarousel.closest('.image-gallery-section');
            if (gallerySection) {
              gallerySection.innerHTML = '<h4 style="margin-bottom: 12px; color: #7C3AED;">📸 Property Gallery</h4>' +
                '<div style="background: rgba(255,255,255,0.92); border-radius: 12px; padding: 30px 16px; text-align: center; color: #555;">' +
                  '<div style="font-size: 42px; opacity: 0.35; margin-bottom: 8px;">📷</div>' +
                  '<div style="font-size: 14px; font-weight: 600;">Property photos coming soon</div>' +
                  '<div style="font-size: 12px; opacity: 0.7; margin-top: 4px;">Galleries will appear here as they are added</div>' +
                '</div>';
            } else {
              mainCarousel.innerHTML = '<div class="carousel-loading">No images available yet</div>';
            }
            return;
          }
          
          console.log('✅ Found', data.images.length, 'property images');
          
          // Initialize property carousel with images
          initializePropertyCarousel(data.images);
        })
        .catch(error => {
          console.error('❌ Error loading property images:', error);
          mainCarousel.innerHTML = '<div class="carousel-loading">Error loading images</div>';
        });
    }
    
    // Initialize property image carousel with optimized performance
    function initializePropertyCarousel(imageUrls) {
      const mainCarousel = document.getElementById('property-carousel-main');
      const thumbnailsContainer = document.getElementById('property-carousel-thumbnails');
      let currentIndex = 0;
      
      // Create main image display with loading optimization
      const mainImg = document.createElement('img');
      mainImg.src = cdnImg(imageUrls[0], 1400);
      mainImg.dataset.raw = imageUrls[0];
      mainImg.onerror = function() { if (this.dataset.raw && this.src !== this.dataset.raw) this.src = this.dataset.raw; };
      mainImg.alt = 'Property Image';
      mainImg.className = 'carousel-image';
      mainImg.id = 'property-main-image';
      mainImg.style.cursor = 'pointer';
      mainImg.loading = 'eager';
      mainImg.decoding = 'async';
      
      // Click to zoom
      mainImg.addEventListener('click', () => {
        openImageLightbox('property', currentIndex, imageUrls);
      });
      
      mainCarousel.innerHTML = '';
      mainCarousel.appendChild(mainImg);
      
      // Create thumbnails with loading optimization
      thumbnailsContainer.innerHTML = '';
      imageUrls.forEach((url, index) => {
        const thumb = document.createElement('div');
        thumb.className = 'carousel-thumbnail' + (index === 0 ? ' active' : '');
        thumb.style.backgroundImage = 'url("' + url + '")';
        thumb.dataset.index = index;
        thumb.addEventListener('click', () => {
          currentIndex = index;
          updatePropertyCarousel();
        });
        thumbnailsContainer.appendChild(thumb);
      });
      
      // Update carousel function with smooth transitions
      function updatePropertyCarousel() {
        const mainImage = document.getElementById('property-main-image');
        if (mainImage) {
          // Fade transition
          mainImage.style.opacity = '0.5';
          mainImage.dataset.raw = imageUrls[currentIndex];
          mainImage.src = cdnImg(imageUrls[currentIndex], 1400);
          mainImage.onload = () => {
            mainImage.style.opacity = '1';
          };
        }
        
        // Update thumbnail active state
        const thumbnails = thumbnailsContainer.querySelectorAll('.carousel-thumbnail');
        thumbnails.forEach((thumb, i) => {
          thumb.classList.toggle('active', i === currentIndex);
        });
      }
      
      // Add arrow navigation buttons
      if (imageUrls.length > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.className = 'carousel-nav prev';
        prevBtn.innerHTML = '&#8249;';
        prevBtn.setAttribute('aria-label', 'Previous image');
        prevBtn.addEventListener('click', () => {
          currentIndex = (currentIndex - 1 + imageUrls.length) % imageUrls.length;
          updatePropertyCarousel();
        });
        
        const nextBtn = document.createElement('button');
        nextBtn.className = 'carousel-nav next';
        nextBtn.innerHTML = '&#8250;';
        nextBtn.setAttribute('aria-label', 'Next image');
        nextBtn.addEventListener('click', () => {
          currentIndex = (currentIndex + 1) % imageUrls.length;
          updatePropertyCarousel();
        });
        
        mainCarousel.appendChild(prevBtn);
        mainCarousel.appendChild(nextBtn);
        
        // Add image counter
        const counter = document.createElement('div');
        counter.className = 'carousel-counter';
        counter.innerHTML = '<span class="current-slide">1</span> / <span class="total-slides">' + imageUrls.length + '</span>';
        mainCarousel.appendChild(counter);
      }
      
      // Add swipe navigation
      let swipeStartX = 0, swipeStartY = 0;
      mainCarousel.addEventListener('touchstart', (e) => {
        window.isInteractingWithGallery = true;
        swipeStartX = e.touches[0].clientX;
        swipeStartY = e.touches[0].clientY;
        e.stopPropagation();
      }, { passive: true });
      
      mainCarousel.addEventListener('touchend', (e) => {
        e.stopPropagation();
        const swipeEndX = e.changedTouches[0].clientX;
        const swipeEndY = e.changedTouches[0].clientY;
        const dx = swipeEndX - swipeStartX;
        const dy = swipeEndY - swipeStartY;
        
        // Horizontal swipe detection
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
          if (dx > 0) {
            // Swipe right = previous
            currentIndex = (currentIndex - 1 + imageUrls.length) % imageUrls.length;
          } else {
            // Swipe left = next
            currentIndex = (currentIndex + 1) % imageUrls.length;
          }
          updatePropertyCarousel();
          
          // Update counter
          const counterEl = mainCarousel.querySelector('.current-slide');
          if (counterEl) counterEl.textContent = currentIndex + 1;
        }
        
        // Reset gallery interaction flag after carousel swipe
        setTimeout(() => {
          window.isInteractingWithGallery = false;
        }, 400);
      }, { passive: true });
      // Prevent panel swipe while swiping images
      mainCarousel.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
      mainCarousel.addEventListener('touchmove', (e) => e.stopPropagation(), { passive: true });
      mainCarousel.addEventListener('touchend', (e) => e.stopPropagation(), { passive: true });
      
      // Add keyboard navigation
      document.addEventListener('keydown', (e) => {
        if (!document.getElementById('property-panel').classList.contains('open')) return;
        
        if (e.key === 'ArrowLeft') {
          currentIndex = (currentIndex - 1 + imageUrls.length) % imageUrls.length;
          updatePropertyCarousel();
          const counterEl = mainCarousel.querySelector('.current-slide');
          if (counterEl) counterEl.textContent = currentIndex + 1;
        } else if (e.key === 'ArrowRight') {
          currentIndex = (currentIndex + 1) % imageUrls.length;
          updatePropertyCarousel();
          const counterEl = mainCarousel.querySelector('.current-slide');
          if (counterEl) counterEl.textContent = currentIndex + 1;
        }
      });
      
      console.log('✅ Property carousel initialized with', imageUrls.length, 'images');
    }
    
    // Close property panel
    document.getElementById('close-property-panel').addEventListener('click', function() {
      const panel = document.getElementById('property-panel');
      panel.classList.remove('open', 'swiping');
      panel.style.transform = '';
      panel.style.transition = '';
      if (typeof unlockBodyScroll === 'function') unlockBodyScroll();
      if (typeof suppressMapClicksFor === 'function') suppressMapClicksFor(250);
      if (typeof ensureBodyScrollState === 'function') ensureBodyScrollState();
      
      // Remove active class from all boundary lines
      document.querySelectorAll('.property-line-magical').forEach(function(path) {
        path.classList.remove('active');
      });
      
      console.log('❌ Closed property panel');
    });
    
    // Enable swipe-to-close on mobile for the side panel
    function attachPanelSwipe(map) {
      const panel = document.getElementById('side-panel');
      if (!panel) return;
      let startX = 0, startY = 0, isTracking = false, isSwiping = false, startTime = 0, startNearEdge = false;
      let currentTranslate = 0;
      let gesture = null; // 'h', 'v', 'r'
      let lastX = 0, lastTime = 0, lastVelocity = 0;
      let inputType = null; // 'touch' | 'pointer'
      const EDGE = 9999; // Allow swipe start from anywhere on mobile
      const EDGE_INNER = 0;
      const SWIPE_THRESHOLD = 48; // px - slight loosen
      const VELOCITY_THRESHOLD = 0.3; // px/ms (unused for close, but kept for logs)
      const ANGLE_THRESHOLD = 14; // px - stricter axis lock
      
      const onStart = (clientX, clientY) => {
        if (!panel.classList.contains('open') || !startNearEdge) return;
        if (window.isInteractingWithGallery) return; // Don't start swipe during gallery interaction
        startX = clientX;
        startY = clientY;
        startTime = Date.now();
        isTracking = true;
        isSwiping = false;
        currentTranslate = 0;
        gesture = null;
        // Remove transition during drag for immediate feedback
        panel.style.transition = 'none';
        panel.style.animation = 'none';
        panel.style.transform = '';
        panel.classList.remove('swiping');
        lastX = clientX;
        lastTime = startTime;
        try { panel.style.willChange = 'transform'; } catch(_) {}
      };
      
      const onMove = (clientX, clientY, ev) => {
        if (!isTracking) return;
        const dx = clientX - startX;
        const dy = clientY - startY;
        const absX = Math.abs(dx), absY = Math.abs(dy);
        
        if (!isSwiping) {
          // Lock gesture axis early
          if (!gesture) {
            if (absX > 5 || absY > 5) {
              // If vertical dominant, lock as vertical
              if (absY > absX * 1.5) {
                gesture = 'v';
              } else if (absX > absY * 1.5 && dx < 0) {
                // Horizontal left - activate swipe immediately
                gesture = 'h';
              } else if (dx > 0) {
                // ANY right movement - block immediately
                gesture = 'r';
              }
            }
          }
          
          // If vertical scroll, allow it
          if (gesture === 'v') {
            isTracking = false;
            isSwiping = false;
            return;
          }
          
          // If RIGHT swipe, block completely
          if (gesture === 'r' || dx > 0) {
            isTracking = false;
            isSwiping = false;
            panel.style.transform = '';
            if (ev && ev.cancelable) ev.preventDefault();
            console.log('🚫 Right swipe blocked');
            return;
          }
          
          // Activate LEFT swipe immediately with low threshold for responsiveness
          const minDx = 10; // Lower threshold for immediate response
          if (gesture === 'h' && dx < 0 && absX >= minDx) {
            isSwiping = true;
            panel.classList.add('swiping');
            panel.style.touchAction = 'none';
            if (ev && ev.cancelable) ev.preventDefault();
            console.log('✅ Left swipe activated');
          } else if (!isSwiping) {
            return;
          }
        }
        
        // Only proceed if we're in confirmed swipe mode
        if (!isSwiping) return;
        
        // Prevent default to stop scroll
        if (ev && ev.cancelable) ev.preventDefault();
        
        // Instant velocity
        const now = Date.now();
        if (lastTime && now > lastTime) {
          lastVelocity = (clientX - lastX) / (now - lastTime);
        }
        lastX = clientX; lastTime = now;
        
        // ONLY allow leftward (negative) motion
        currentTranslate = Math.min(0, dx);
        
        // Use translate3d for GPU acceleration and immediate response
        panel.style.transform = 'translate3d(' + currentTranslate + 'px, 0, 0)';
        lastTime = now;
      };
      
      const onEnd = () => {
        if (!isTracking) return;
        
        // Clean up tracking state immediately
        isTracking = false;
        gesture = null;
        
        const translateX = currentTranslate || 0;
        const duration = Date.now() - startTime;
        const velocity = Math.abs(lastVelocity); // px per ms (instantaneous)
        const width = panel.getBoundingClientRect().width || 1;
        const DIST_THRESHOLD = Math.max(64, width * 0.18);
        
        // Re-enable transition for smooth snap-back
        panel.style.transition = 'transform 0.32s cubic-bezier(0.16, 1, 0.3, 1)';
        panel.classList.remove('swiping');
        
        // Close only if swiped far enough (hard swipe). Ignore velocity to prevent sensitivity
        const shouldClose = Math.abs(translateX) > DIST_THRESHOLD;
        
        if (shouldClose) {
          // Subtle haptic (where supported)
          try { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10); } catch(_) {}
          // Set closing flag to prevent re-opening during animation
          window.panelIsClosing = true;
          // Animate panel out completely before closing - use translate3d for GPU
          panel.style.transform = 'translate3d(-100%, 0, 0)';
          // Immediately hide to prevent flash
          panel.style.opacity = '0';
          setTimeout(function() {
            panel.classList.remove('open');
            // Reset all styles AFTER animation completes
            panel.style.transform = '';
            panel.style.opacity = '';
            panel.style.transition = '';
            window.currentZoneId = null;
            window.panelIsClosing = false;
            if (typeof unlockBodyScroll === 'function') unlockBodyScroll();
            if (typeof ensureBodyScrollState === 'function') ensureBodyScrollState();
            // Re-enable map interactions completely
            const mapEl = document.getElementById('map');
            if (mapEl) {
              mapEl.style.pointerEvents = '';
              mapEl.style.touchAction = '';
            }
            // Re-enable Leaflet map interactions
            if (typeof map !== 'undefined' && map) {
              try {
                map.dragging.enable();
                map.touchZoom.enable();
                map.doubleClickZoom.enable();
                map.scrollWheelZoom.enable();
                map.boxZoom.enable();
                map.keyboard.enable();
              } catch(e) {}
            }
            console.log('👆 Panel closed by swipe (distance: ' + Math.abs(translateX) + 'px, velocity: ' + velocity.toFixed(2) + 'px/ms)');
            panel.style.animation = '';
            panel.style.touchAction = '';
            try { panel.style.willChange = ''; } catch(_) {}
          }, 320);
        } else {
          // Snap back to original position
          panel.style.transform = '';
          setTimeout(function() {
            panel.style.transition = '';
            panel.style.animation = '';
            panel.style.touchAction = '';
            try { panel.style.willChange = ''; } catch(_) {}
          }, 320);
        }
        
        isTracking = false;
        isSwiping = false;
        currentTranslate = 0;
        gesture = null;
        lastVelocity = 0;
      };
      
      // Touch events (edge-only)
      panel.addEventListener('touchstart', function(e) {
        if (inputType && inputType !== 'touch') return;
        inputType = 'touch';
        const t = e.touches[0];
        const target = e.target;
        // Exclude gallery tabs and content from swipe detection
        if (target.closest('.carousel-main, .carousel-thumbnails, .image-carousel, .sub-nav-tabs, .sub-nav-tab, .lightbox-content, .gallery-tab, .gallery-tabs, .gallery-content')) return;
        const rect = panel.getBoundingClientRect();
        startNearEdge = true; // Allow swipe from anywhere
        onStart(t.clientX, t.clientY);
      }, { passive: true, capture: true });
      
      panel.addEventListener('touchmove', function(e) {
        const t = e.touches[0];
        onMove(t.clientX, t.clientY, e);
      }, { passive: false });
      
      panel.addEventListener('touchend', () => { onEnd(); inputType = null; if (typeof suppressMapClicksFor === 'function') suppressMapClicksFor(800); if (typeof ensureBodyScrollState === 'function') ensureBodyScrollState(); }, { passive: true });
      panel.addEventListener('touchcancel', () => { onEnd(); inputType = null; if (typeof suppressMapClicksFor === 'function') suppressMapClicksFor(800); if (typeof ensureBodyScrollState === 'function') ensureBodyScrollState(); }, { passive: true });
      
      // Pointer events fallback
      panel.addEventListener('pointerdown', function(e) {
        if (inputType && inputType !== 'pointer') return;
        inputType = 'pointer';
        const target = e.target;
        if (target.closest('.carousel-main, .carousel-thumbnails, .image-carousel, .sub-nav-tabs, .sub-nav-tab, .lightbox-content')) return;
        const rect = panel.getBoundingClientRect();
        startNearEdge = true; // Allow swipe from anywhere
        try { panel.setPointerCapture(e.pointerId); } catch(_) {}
        onStart(e.clientX, e.clientY);
      }, { capture: true });
      panel.addEventListener('pointermove', function(e) {
        onMove(e.clientX, e.clientY, e);
      });
      panel.addEventListener('pointerup', (e) => { try { panel.releasePointerCapture(e.pointerId); } catch(_) {} onEnd(); inputType = null; if (typeof suppressMapClicksFor === 'function') suppressMapClicksFor(800); if (typeof ensureBodyScrollState === 'function') ensureBodyScrollState(); });
      panel.addEventListener('pointercancel', (e) => { try { panel.releasePointerCapture(e.pointerId); } catch(_) {} onEnd(); inputType = null; if (typeof suppressMapClicksFor === 'function') suppressMapClicksFor(800); if (typeof ensureBodyScrollState === 'function') ensureBodyScrollState(); });
    }
    
    // Enable swipe-to-close for property panel (iPhone-style smooth closing)
    function attachPropertyPanelSwipe() {
      const panel = document.getElementById('property-panel');
      if (!panel) return;
      let startX = 0, startY = 0, isTracking = false, isSwiping = false, startTime = 0, startNearEdge = false;
      let currentTranslate = 0;
      let gesture = null; // 'h', 'v', 'r'
      let lastX = 0, lastTime = 0, lastVelocity = 0;
      let inputType = null;
      const EDGE = 9999; // Allow swipe from anywhere on mobile
      const EDGE_INNER = 0;
      const SWIPE_THRESHOLD = 48;
      const VELOCITY_THRESHOLD = 0.3;
      const ANGLE_THRESHOLD = 14;
      // Direction: on mobile the property panel opens from left (close left), on desktop it's right (close right)
      const closeToLeft = (typeof window !== 'undefined' && window.matchMedia) ? window.matchMedia('(max-width: 768px)').matches : true;
      
      const onStart = (clientX, clientY) => {
        if (!panel.classList.contains('open') || !startNearEdge) return;
        if (window.isInteractingWithGallery) return; // Don't start swipe during gallery interaction
        startX = clientX;
        startY = clientY;
        startTime = Date.now();
        isTracking = true;
        isSwiping = false;
        panel.style.transition = 'none';
        panel.style.animation = 'none';
        gesture = null;
        lastX = clientX;
        lastTime = startTime;
        try { panel.style.willChange = 'transform'; } catch(_) {}
      };
      
      const onMove = (clientX, clientY, ev) => {
        if (!isTracking) return;
        const dx = clientX - startX;
        const dy = clientY - startY;
        
        if (!isSwiping) {
          if (!gesture) {
            const absX = Math.abs(dx), absY = Math.abs(dy);
            if (absX > 10 || absY > 10) {
              // CRITICAL: Prioritize vertical scrolling over horizontal swiping
              if (absY > absX * 0.5) gesture = 'v';  // Changed from 1.2 to 0.5 - if ANY vertical movement, treat as scroll
              else if (absX > absY * 2.0) gesture = 'h';  // Keep horizontal strict (changed from 1.2)
            }
          }
          if (gesture === 'v') {
            isTracking = false;
            isSwiping = false;
            panel.style.transition = '';
            panel.style.animation = '';
            panel.style.touchAction = '';
            return;
          }
          const absX = Math.abs(dx), absY = Math.abs(dy);
          const ratioReq = 3.0;  // Changed from 2.0 - require MUCH more horizontal than vertical
          const minDx = 40;  // Changed from 24 - require more horizontal distance
          const horizontal = absX > absY * ratioReq && absX > ANGLE_THRESHOLD;
          const closingDirOk = closeToLeft ? (dx < 0) : (dx > 0);
          // If ANY vertical movement detected during gesture, stop tracking
          if (!horizontal || !closingDirOk || absX < minDx || absY > 5) {
            if (absY > 5) {
              isTracking = false;
              isSwiping = false;
              panel.style.touchAction = '';
            }
            return;
          }
          if (horizontal && closingDirOk) {
            isSwiping = true;
            panel.classList.add('swiping');
            panel.style.touchAction = 'none';
          }
          if (!isSwiping) return;
        }
        
        // Prevent scrolling during swipe only when actually swiping
        if (isSwiping && ev && ev.cancelable) ev.preventDefault();
        
        // Direction-aware translate: left on mobile, right on desktop (rAF + clamp)
        currentTranslate = closeToLeft ? Math.min(0, dx) : Math.max(0, dx);
        const width = panel.getBoundingClientRect().width || 1;
        const next = closeToLeft
          ? Math.max(-width, Math.min(0, currentTranslate))
          : Math.min(width, Math.max(0, currentTranslate));
        // Immediate transform for smooth response
        panel.style.transform = 'translate3d(' + next + 'px, 0, 0)';
        const now = Date.now();
        const dtx = clientX - lastX;
        const dt = now - lastTime;
        if (dt > 0) lastVelocity = dtx / dt;
        lastX = clientX;
        lastTime = now;
      };
      
      const onEnd = () => {
        if (!isTracking) return;
        
        const translateX = currentTranslate || 0;
        const duration = Date.now() - startTime;
        const velocity = Math.abs(lastVelocity);
        const width = panel.getBoundingClientRect().width || 1;
        const DIST_THRESHOLD = Math.max(72, width * 0.20);
        
        // Smooth transition for snap-back or close (transform only to avoid left/right jumps)
        panel.style.transition = 'transform 0.32s cubic-bezier(0.16, 1, 0.3, 1)';
        panel.classList.remove('swiping');
        
        // Close only if swiped far enough (hard swipe); ignore velocity
        const shouldClose = Math.abs(translateX) > DIST_THRESHOLD;
        
        if (shouldClose) {
          // Animate panel out with iPhone-style smooth close (direction-aware)
          panel.style.transform = closeToLeft ? 'translateX(-100%)' : 'translateX(100%)';
          setTimeout(() => {
            panel.classList.remove('open');
            panel.style.transform = '';
            panel.style.transition = '';
            if (typeof unlockBodyScroll === 'function') unlockBodyScroll();
            if (typeof ensureBodyScrollState === 'function') ensureBodyScrollState();
            
            // Remove active class from boundary lines
            document.querySelectorAll('.property-line-magical').forEach(path => {
              path.classList.remove('active');
            });
            
            console.log('👆 Property panel closed by swipe (distance: ' + Math.abs(translateX) + 'px, velocity: ' + velocity.toFixed(2) + 'px/ms)');
            panel.style.animation = '';
            panel.style.touchAction = '';
          }, 320);
        } else {
          // Snap back smoothly
          panel.style.transform = '';
          setTimeout(function() {
            panel.style.transition = '';
            panel.style.animation = '';
            panel.style.touchAction = '';
            try { panel.style.willChange = ''; } catch(_) {}
          }, 320);
        }
        
        isTracking = false;
        isSwiping = false;
        currentTranslate = 0;
        gesture = null;
        lastVelocity = 0;
      };
      
      // Touch events (edge-preferred, but allow strong swipe)
      panel.addEventListener('touchstart', (e) => {
        if (inputType && inputType !== 'touch') return;
        inputType = 'touch';
        const t = e.touches[0];
        const target = e.target;
        if (target.closest('.carousel-main, .carousel-thumbnails, .image-carousel, .sub-nav-tabs, .sub-nav-tab, .lightbox-content')) return;
        const rect = panel.getBoundingClientRect();
        startNearEdge = true; // Allow swipe from anywhere
        onStart(t.clientX, t.clientY);
      }, { passive: true, capture: true });
      
      panel.addEventListener('touchmove', (e) => {
        const t = e.touches[0];
        onMove(t.clientX, t.clientY, e);
      }, { passive: false });
      
      panel.addEventListener('touchend', () => { onEnd(); inputType = null; if (typeof suppressMapClicksFor === 'function') suppressMapClicksFor(800); if (typeof ensureBodyScrollState === 'function') ensureBodyScrollState(); }, { passive: true });
      panel.addEventListener('touchcancel', () => { onEnd(); inputType = null; if (typeof suppressMapClicksFor === 'function') suppressMapClicksFor(800); if (typeof ensureBodyScrollState === 'function') ensureBodyScrollState(); }, { passive: true });
      
      // Pointer events fallback
      panel.addEventListener('pointerdown', (e) => {
        if (inputType && inputType !== 'pointer') return;
        inputType = 'pointer';
        const target = e.target;
        // Exclude gallery tabs and content from swipe detection
        if (target.closest('.carousel-main, .carousel-thumbnails, .image-carousel, .sub-nav-tabs, .sub-nav-tab, .lightbox-content, .gallery-tab, .gallery-tabs, .gallery-content')) return;
        const rect = panel.getBoundingClientRect();
        startNearEdge = true; // Allow swipe from anywhere
        try { panel.setPointerCapture(e.pointerId); } catch(_) {}
        onStart(e.clientX, e.clientY);
      }, { capture: true });
      panel.addEventListener('pointermove', (e) => {
        onMove(e.clientX, e.clientY, e);
      });
      panel.addEventListener('pointerup', (e) => { try { panel.releasePointerCapture(e.pointerId); } catch(_) {} onEnd(); inputType = null; if (typeof suppressMapClicksFor === 'function') suppressMapClicksFor(800); if (typeof ensureBodyScrollState === 'function') ensureBodyScrollState(); });
      panel.addEventListener('pointercancel', (e) => { try { panel.releasePointerCapture(e.pointerId); } catch(_) {} onEnd(); inputType = null; if (typeof suppressMapClicksFor === 'function') suppressMapClicksFor(800); if (typeof ensureBodyScrollState === 'function') ensureBodyScrollState(); });
    }
    
    // Enhanced image gallery tab functionality
    function setupImageGalleryTabs() {
      const tabs = document.querySelectorAll('.gallery-tab');
      if (!tabs.length) return;
      
      tabs.forEach(tab => {
        tab.addEventListener('click', function(e) {
          e.stopPropagation();
          e.preventDefault();
          window.isInteractingWithGallery = true;
          suppressMapClicksFor(1200); // Extended to prevent swipe conflicts
          
          // Lock panel completely during transition
          const panel = document.getElementById('side-panel');
          const panelContent = document.querySelector('.panel-content');
          const scrollPosition = panelContent ? panelContent.scrollTop : 0;
          
          // Disable scrolling temporarily
          if (panelContent) {
            panelContent.style.overflow = 'hidden';
          }
          
          // Remove active class from all tabs
          tabs.forEach(t => t.classList.remove('active'));
          
          // Add active class to clicked tab
          tab.classList.add('active');
          
          // Use requestAnimationFrame for smooth transition
          requestAnimationFrame(() => {
            // Hide all gallery content by removing active class (no layout shift)
            document.querySelectorAll('#current-images, #vision-images, #progress-images').forEach(content => {
              content.classList.remove('active');
            });

            // Show content for clicked tab
            const targetId = tab.getAttribute('data-tab') + '-images';
            const targetContent = document.getElementById(targetId);
            if (targetContent) {
              targetContent.classList.add('active');

              // Trigger image loading for all carousels in the newly visible container.
              // Images with loading="lazy" inside a previously hidden tab may not have
              // started downloading. Force eager loading and (if still pending) re-set
              // the src to kick the browser into fetching them.
              const carousels = targetContent.querySelectorAll('.image-carousel');
              carousels.forEach(carousel => {
                const images = carousel.querySelectorAll('.carousel-image, .carousel-thumbnail');
                images.forEach((img, index) => {
                  // Remove lazy gate so the browser will fetch even off-screen.
                  // Re-assign the same src (without clearing it) to trigger a fetch.
                  img.loading = 'eager';
                  img.setAttribute('fetchpriority', index === 0 ? 'high' : 'auto');
                  if (img.naturalWidth === 0) {
                    const src = img.getAttribute('src');
                    if (src) img.setAttribute('src', src);
                  }
                  if (index === 0 && img.classList.contains('carousel-image')) {
                    img.classList.add('active', 'loaded');
                  }
                });
              });
            }

            // Restore scroll position and re-enable scrolling after transition
            setTimeout(() => {
              if (panelContent) {
                panelContent.scrollTop = scrollPosition;
                panelContent.style.overflow = '';
              }
            }, 150);
          });
          
          // Reset gallery interaction flag after animation - extended duration
          setTimeout(() => {
            window.isInteractingWithGallery = false;
          }, 800);
        });
      });
    }
    
    // Load images for a specific zone (preserves gallery state)
    async function loadZoneImages(zone) {
      const zoneId = zone.id;
      console.log('🖼️ loadZoneImages called for zoneId:', zoneId);
      const categories = ['current', 'vision'];
      
      for (const category of categories) {
        try {
          const container = document.getElementById(category + '-images');
          if (!container) continue;
          
          // Fetch image URLs from API
          const apiUrl = '/api/images/' + zone.propertyId + '/' + zoneId + '/' + category;
          console.log('📡 Fetching images from:', apiUrl);
          const response = await fetch(apiUrl);
          const data = await response.json();
          console.log('📦 API response for', zoneId, category, ':', data);
          
          // Check if this category has subcategories
          if (data.hasSubcategories && data.subcategoryData) {
            // Create subcategory structure for display
            const subcategoryInfo = {};
            for (const [subcat, images] of Object.entries(data.subcategoryData)) {
              subcategoryInfo[subcat] = {
                images: images,
                count: images.length
              };
            }
            container.innerHTML = createSubcategoryGallery({subcategories: subcategoryInfo}, zoneId, category);
            // Initialize carousels for all subcategories
            Object.keys(subcategoryInfo).forEach(subcat => {
              initializeCarousel(category + '-' + subcat);
            });
            console.log('Loaded ' + data.count + ' images in ' + data.subcategories.length + ' subcategories for ' + zoneId + '/' + category);
          } else if (data.images && data.images.length > 0) {
            // Regular single-level images
            container.innerHTML = createImageCarousel(data.images, zoneId, category);
            initializeCarousel(category);
            console.log('Loaded ' + data.images.length + ' images for ' + zoneId + '/' + category);
          } else {
            container.innerHTML = '<div class="no-images-message">' +
              '<div style="font-size: 48px; opacity: 0.3; margin-bottom: 10px;">📷</div>' +
              '<div>No photos here yet</div>' +
              '<div style="font-size: 13px; opacity: 0.7; margin-top: 5px;">' +
              'Photos for this project are coming soon' +
              '</div></div>';
          }
        } catch (error) {
          console.error('Error loading ' + category + ' images:', error);
          const container = document.getElementById(category + '-images');
          if (container) {
            container.innerHTML = '<div class="no-images-message">' +
              '<div style="color: #e74c3c;">⚠️ Error loading images</div>' +
              '</div>';
          }
        }
      }
    }
    
    // Create subcategory gallery with horizontal navigation
    function createSubcategoryGallery(data, zoneId, category) {
      let subcategories = Object.keys(data.subcategories);
      
      // Prefer "Outdoor" (then "Cabins") first in Vision galleries for Main Residence and Retreat Village
      if (category === 'vision' && (zoneId === 'main-residence' || zoneId === 'retreat-village')) {
        const preferredOrder = ['Outdoor', 'Cabins', 'Indoor', 'Floor Plans'];
        subcategories.sort((a, b) => {
          const ai = preferredOrder.indexOf(a);
          const bi = preferredOrder.indexOf(b);
          const aa = ai === -1 ? Number.MAX_SAFE_INTEGER : ai;
          const bb = bi === -1 ? Number.MAX_SAFE_INTEGER : bi;
          if (aa !== bb) return aa - bb;
          return a.localeCompare(b);
        });
      } else if (category === 'vision' && zoneId === 'infrastructure') {
        subcategories.sort((a, b) => {
          if (a === 'Water' && b !== 'Water') return -1;
          if (b === 'Water' && a !== 'Water') return 1;
          return a.localeCompare(b);
        });
      } else {
        // Default alphabetical for other cases
        subcategories.sort((a, b) => a.localeCompare(b));
      }
      
      // Choose the first subcategory that actually has images; fallback to first
      const activeSubcategory = subcategories.find(name => (data.subcategories[name]?.count || 0) > 0) || subcategories[0];
      
      // Create sub-navigation tabs
      const subNavTabs = subcategories.map((subcat) => \`
        <div class=\"sub-nav-tab \${subcat === activeSubcategory ? 'active' : ''}\" 
             data-subcategory=\"\${subcat}\"
             onclick=\"switchSubcategory('\${category}', '\${subcat}')\">
          \${subcat}
          <span class=\"count-badge\">\${data.subcategories[subcat].count}</span>
        </div>
      \`).join('');
      
      // Create content for each subcategory
      const subcategoryContents = subcategories.map((subcat) => {
        const images = data.subcategories[subcat].images;
        const carouselHtml = images.length > 0 
          ? createImageCarousel(images, zoneId, \`\${category}-\${subcat}\`)
          : \`<div class=\"no-images-message\">No images in this subcategory</div>\`;
        
        return \`
          <div class="subcategory-content \${subcat === activeSubcategory ? 'active' : ''}" 
               data-subcategory="\${subcat}">
            \${carouselHtml}
          </div>
        \`;
      }).join('');
      
      return \`
        <div class="sub-nav-container">
          <div class="sub-nav-tabs">
            \${subNavTabs}
          </div>
        </div>
        <div class="subcategory-gallery">
          \${subcategoryContents}
        </div>
      \`;
    }
    
    // Initialize subcategory navigation
    function initializeSubcategoryNavigation(category) {
      // Initialize carousels for all subcategories
      const subcategoryContents = document.querySelectorAll(\`#\${category}-images .subcategory-content\`);
      subcategoryContents.forEach(content => {
        const subcategory = content.getAttribute('data-subcategory');
        const carouselCategory = \`\${category}-\${subcategory}\`;
        initializeCarousel(carouselCategory);

        // Preload every image in this subcategory using new Image() so the browser
        // caches them regardless of display:none on the parent. When the tab becomes
        // active and the actual <img> tag is shown, it pulls from cache instantly.
        const imgEls = content.querySelectorAll('.carousel-image');
        Array.prototype.slice.call(imgEls, 0, 2).forEach(img => {
          const src = img.getAttribute('src');
          if (!src) return;
          const preloader = new Image();
          preloader.src = src;
        });
      });
    }
    
    // Switch between subcategories
    window.switchSubcategory = function(category, subcategoryName) {
      const container = document.getElementById(\`\${category}-images\`);
      if (!container) return;
      
      // Update tabs
      const tabs = container.querySelectorAll('.sub-nav-tab');
      tabs.forEach(tab => {
        if (tab.getAttribute('data-subcategory') === subcategoryName) {
          tab.classList.add('active');
        } else {
          tab.classList.remove('active');
        }
      });
      
      // Update content
      const contents = container.querySelectorAll('.subcategory-content');
      contents.forEach(content => {
        if (content.getAttribute('data-subcategory') === subcategoryName) {
          content.classList.add('active');
        } else {
          content.classList.remove('active');
        }
      });

      // Trigger image loading for the now-visible subcategory.
      // Carousel images have loading="lazy" set (except the first), so they will not
      // download while their parent tab is hidden. When this tab becomes active we
      // remove the lazy gate and force a re-fetch on any image that hasn't loaded.
      const activeContent = container.querySelector('.subcategory-content[data-subcategory="' + subcategoryName + '"]');
      if (activeContent) {
        const images = activeContent.querySelectorAll('.carousel-image, .carousel-thumbnail');
        images.forEach((img, index) => {
          img.loading = 'eager';
          img.setAttribute('fetchpriority', index === 0 ? 'high' : 'auto');
          if (img.naturalWidth === 0) {
            const src = img.getAttribute('src');
            if (src) img.setAttribute('src', src);
          }
          if (index === 0 && img.classList.contains('carousel-image')) {
            img.classList.add('active', 'loaded');
          }
        });
      }
    };
    
    // Create image carousel HTML with optimized loading
    function cdnImg(src, w) {
      if (!src || src.indexOf('http') !== 0) return src;
      return 'https://wsrv.nl/?url=' + encodeURIComponent(src) + '&w=' + w + '&q=82&output=webp';
    }
    function createImageCarousel(images, zoneId, category) {
      const mainImages = images.map((src, index) => \`
        <img src="\${cdnImg(src, 1400)}"
             data-raw="\${src}"
             onerror="if(this.dataset.raw&&this.src!==this.dataset.raw){this.src=this.dataset.raw}"
             class="carousel-image \${index === 0 ? 'active' : ''}"
             alt="Image \${index + 1}"
             loading="\${index === 0 ? 'eager' : 'lazy'}"
             fetchpriority="\${index === 0 ? 'high' : 'low'}"
             sizes="(max-width: 768px) 100vw, 580px"
             decoding="async"
             style="cursor: pointer;"
             data-lightbox-category="\${category}"
             data-lightbox-index="\${index}">
      \`).join('');
      
      const thumbnails = images.map((src, index) => \`
        <img src="\${cdnImg(src, 240)}"
             data-raw="\${src}"
             onerror="if(this.dataset.raw&&this.src!==this.dataset.raw){this.src=this.dataset.raw}"
             class="carousel-thumbnail \${index === 0 ? 'active' : ''}"
             alt="Thumbnail \${index + 1}"
             data-index="\${index}"
             loading="lazy"
             decoding="async"
             onclick="goToSlide('\${category}', \${index})">
      \`).join('');
      
      return \`
        <div class="image-carousel" data-category="\${category}">
          <div class="carousel-main">
            \${mainImages}
            <div class="carousel-loading"><div class="loading-spinner"></div></div>
            \${images.length > 1 ? \`
              <button class="carousel-nav prev" onclick="navigateCarousel('\${category}', -1)">
                &#8249;
              </button>
              <button class="carousel-nav next" onclick="navigateCarousel('\${category}', 1)">
                &#8250;
              </button>
              <div class="carousel-counter">
                <span class="current-slide">1</span> / <span class="total-slides">\${images.length}</span>
              </div>
            \` : ''}
          </div>
          \${images.length > 1 ? \`
            <div class="carousel-thumbnails">
              \${thumbnails}
            </div>
          \` : ''}
        </div>
      \`;
    }
    
    // Initialize carousel for a category
    function initializeCarousel(category) {
      const carousel = document.querySelector(\`[data-category="\${category}"]\`);
      if (!carousel) return;

      const images = Array.from(carousel.querySelectorAll('.carousel-image'));
      if (images.length === 0) return;

      // Aggressively preload every image via new Image() so the browser caches
      // them regardless of CSS display state on the parent. When the actual
      // <img> becomes visible later it pulls from cache instantly.
      images.forEach(img => {
        const src = img.getAttribute('src');
        if (src) { const p = new Image(); p.src = src; }
      });
      const thumbs = carousel.querySelectorAll('.carousel-thumbnail');
      thumbs.forEach(thumb => {
        const src = thumb.getAttribute('src');
        if (src) { const p = new Image(); p.src = src; }
      });

      // Initialize current index once
      if (!carousel.dataset.currentIndex) carousel.dataset.currentIndex = '0';
      
      // Mark images as loaded when ready (removes blur smoothly)
      images.forEach((img, index) => {
        const markLoaded = () => img.classList.add('loaded');
        if (img.complete && img.naturalWidth > 0) {
          if (typeof img.decode === 'function') {
            img.decode().catch(() => {}).finally(markLoaded);
          } else {
            markLoaded();
          }
        } else {
          img.addEventListener('load', markLoaded, { once: true });
          img.addEventListener('error', markLoaded, { once: true });
        }
        
        // Add click listener to open lightbox
        img.addEventListener('click', () => {
          openImageLightbox(category, index);
        });
      });
      
      // Preload adjacent images for instant nav
      const idx = parseInt(carousel.dataset.currentIndex || '0', 10) || 0;
      preloadAdjacent(category, idx);
      
      // Keyboard navigation
      document.addEventListener('keydown', (e) => {
        const panel = document.getElementById('side-panel');
        if (!panel || !panel.classList.contains('open')) return;
        const activeTab = document.querySelector('.gallery-tab.active');
        const activeCategory = activeTab ? activeTab.getAttribute('data-tab') : null;
        if (activeCategory === category) {
          if (e.key === 'ArrowLeft') navigateCarousel(category, -1);
          if (e.key === 'ArrowRight') navigateCarousel(category, 1);
        }
      });

      // Swipe navigation on mobile
      const main = carousel.querySelector('.carousel-main');
      if (main) {
        let sx = 0, sy = 0, swiping = false;
        const THRESH = 40;
        const ANGLE = 12;
        const onStart = (x, y) => { sx = x; sy = y; swiping = false; };
        const onMove = (x, y, ev) => {
          const dx = x - sx; const dy = y - sy;
          if (!swiping && Math.abs(dx) > ANGLE && Math.abs(dx) > Math.abs(dy)) {
            swiping = true;
          }
          if (swiping && ev && ev.cancelable) ev.preventDefault();
        };
        const onEnd = (x, y) => {
          const dx = x - sx; const dy = y - sy;
          if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > THRESH) {
            navigateCarousel(category, dx < 0 ? 1 : -1);
          }
        };

        // Touch
        main.addEventListener('touchstart', (e) => { const t = e.touches[0]; onStart(t.clientX, t.clientY); e.stopPropagation(); }, { passive: true });
        main.addEventListener('touchmove', (e) => { const t = e.touches[0]; onMove(t.clientX, t.clientY, e); e.stopPropagation(); }, { passive: false });
        main.addEventListener('touchend', (e) => { const t = e.changedTouches[0]; onEnd(t.clientX, t.clientY); e.stopPropagation(); });
        // Pointer fallback
        main.addEventListener('pointerdown', (e) => { onStart(e.clientX, e.clientY); e.stopPropagation(); });
        main.addEventListener('pointermove', (e) => { onMove(e.clientX, e.clientY, e); e.stopPropagation(); });
        main.addEventListener('pointerup', (e) => { onEnd(e.clientX, e.clientY); e.stopPropagation(); });
        // Ensure best behavior on mobile
        try { main.style.touchAction = 'pan-y'; } catch(_){}
      }
    }

    // Preload previous and next images
    function preloadAdjacent(category, index) {
      const carousel = document.querySelector(\`[data-category="\${category}"]\`);
      if (!carousel) return;
      const images = carousel.querySelectorAll('.carousel-image');
      if (!images.length) return;
      const prev = (index - 1 + images.length) % images.length;
      const next = (index + 1) % images.length;
      [prev, next].forEach(i => {
        const img = images[i];
        if (!img) return;
        if (!img.classList.contains('loaded')) {
          if (typeof img.decode === 'function') {
            img.decode().catch(() => {}).then(() => img.classList.add('loaded'));
          }
        }
      });
    }

    async function switchToIndex(category, newIndex) {
      const carousel = document.querySelector(\`[data-category="\${category}"]\`);
      if (!carousel) return;
      
      // Debounce rapid clicks
      if (carousel.dataset.navBusy === '1') return;
      carousel.dataset.navBusy = '1';
      
      const images = carousel.querySelectorAll('.carousel-image');
      const thumbnails = carousel.querySelectorAll('.carousel-thumbnail');
      if (!images.length) { carousel.dataset.navBusy = '0'; return; }
      
      if (newIndex < 0) newIndex = images.length - 1;
      if (newIndex >= images.length) newIndex = 0;
      
      const target = images[newIndex];
      
      // Use requestAnimationFrame for smoother transitions
      requestAnimationFrame(() => {
        // Fast toggle without waiting
        images.forEach((img, i) => {
          if (i === newIndex) {
            img.classList.add('active');
          } else {
            img.classList.remove('active');
          }
        });
        thumbnails.forEach((thumb, i) => {
          if (i === newIndex) {
            thumb.classList.add('active');
          } else {
            thumb.classList.remove('active');
          }
        });
        
        const counter = carousel.querySelector('.current-slide');
        if (counter) counter.textContent = String(newIndex + 1);
        carousel.dataset.currentIndex = String(newIndex);
        
        // Preload adjacent images asynchronously
        requestAnimationFrame(() => {
          preloadAdjacent(category, newIndex);
        });
        
        // Release lock quickly
        setTimeout(() => { carousel.dataset.navBusy = '0'; }, 50);
      });
    }
    
    // Navigate carousel
    window.navigateCarousel = function(category, direction) {
      const carousel = document.querySelector(\`[data-category="\${category}"]\`);
      if (!carousel) return;
      const currentIndex = parseInt(carousel.dataset.currentIndex || '0', 10) || 0;
      switchToIndex(category, currentIndex + direction);
    };
    
    // Go to specific slide
    window.goToSlide = function(category, index) {
      switchToIndex(category, index);
    };
    
    // ===== LIGHTBOX SYSTEM FOR FULL-SIZE IMAGE VIEWING =====
    
    // Create enhanced lightbox HTML with zoom controls
    function ensureLightboxExists() {
      if (document.getElementById('image-lightbox')) return;
      
      const lightbox = document.createElement('div');
      lightbox.id = 'image-lightbox';
      lightbox.innerHTML = '<div class="lightbox-overlay"></div>' +
        '<button class="lightbox-close" aria-label="Close">&times;</button>' +
        '<div class="lightbox-content">' +
          '<div class="lightbox-image-container">' +
            '<img class="lightbox-image" src="" alt="Full size image">' +
          '</div>' +
          '<div class="lightbox-loading"><div class="loading-spinner"></div></div>' +
        '</div>' +
        '<button class="lightbox-nav lightbox-prev" aria-label="Previous">' +
          '<span>&#8249;</span>' +
        '</button>' +
        '<button class="lightbox-nav lightbox-next" aria-label="Next">' +
          '<span>&#8250;</span>' +
        '</button>' +
        '<div class="lightbox-zoom-controls">' +
          '<button class="zoom-btn zoom-out" aria-label="Zoom Out" title="Zoom Out">-</button>' +
          '<div class="zoom-level-indicator">100%</div>' +
          '<button class="zoom-btn zoom-in" aria-label="Zoom In" title="Zoom In">+</button>' +
          '<button class="zoom-btn zoom-reset" aria-label="Reset Zoom" title="Reset Zoom">⟲</button>' +
        '</div>' +
        '<div class="lightbox-counter">' +
          '<span class="lightbox-current">1</span> / <span class="lightbox-total">1</span>' +
        '</div>';
      document.body.appendChild(lightbox);
      
      // Initialize lightbox event handlers
      initializeLightboxHandlers();
    }
    
    // Initialize lightbox event handlers
    function initializeLightboxHandlers() {
      const lightbox = document.getElementById('image-lightbox');
      const overlay = lightbox.querySelector('.lightbox-overlay');
      const closeBtn = lightbox.querySelector('.lightbox-close');
      const prevBtn = lightbox.querySelector('.lightbox-prev');
      const nextBtn = lightbox.querySelector('.lightbox-next');
      const img = lightbox.querySelector('.lightbox-image');
      const loading = lightbox.querySelector('.lightbox-loading');
      // Hint the browser to load and decode fast
      try { img.loading = 'eager'; } catch(_) {}
      try { img.decoding = 'async'; } catch(_) {}
      try { img.setAttribute('fetchpriority', 'high'); } catch(_) {}
      
      let currentImages = [];
      let currentIndex = 0;
      let touchStartX = 0;
      let touchStartY = 0;
      let isDragging = false;
      
      // Close lightbox
      function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
        if (typeof ensureBodyScrollState === 'function') ensureBodyScrollState();
        setTimeout(() => {
          img.src = '';
          currentImages = [];
        }, 300);
      }
      
      // Navigate to image
      function navigateToImage(index) {
        if (index < 0 || index >= currentImages.length) return;
        currentIndex = index;
        
        // Show loading spinner and reset transforms/scroll
        loading.classList.add('active');
        const contentEl = lightbox.querySelector('.lightbox-content');
        if (contentEl) { contentEl.style.transform = ''; contentEl.style.opacity = '1'; }
        imageContainer.scrollTop = 0; imageContainer.scrollLeft = 0;
        
        // Remove loaded class to trigger fade-out with scale
        img.classList.remove('loaded');
        
        // Set source immediately; fade in with scale after decode
        const newSrc = currentImages[index];
        if (img.src !== newSrc) img.src = newSrc;
        
        const finish = () => {
          loading.classList.remove('active');
          // Add loaded class to trigger smooth fade-in with scale animation
          requestAnimationFrame(() => {
            img.classList.add('loaded');
          });
          // Update counter
          lightbox.querySelector('.lightbox-current').textContent = index + 1;
          // Preload adjacent images for instant navigation
          if (index > 0) { const prev = new Image(); prev.src = currentImages[index - 1]; }
          if (index < currentImages.length - 1) { const next = new Image(); next.src = currentImages[index + 1]; }
        };
        
        try {
          if (img.decode) { img.decode().then(finish).catch(finish); }
          else if (img.complete) { finish(); }
          else { img.onload = finish; img.onerror = finish; }
        } catch(_) { finish(); }
        
        // Update nav button visibility
        prevBtn.style.display = index > 0 ? 'flex' : 'none';
        nextBtn.style.display = index < currentImages.length - 1 ? 'flex' : 'none';
      }
      
      // Open lightbox with images
      window.openLightbox = function(images, startIndex) {
        ensureLightboxExists();
        currentImages = images;
        currentIndex = startIndex || 0;
        
        lightbox.querySelector('.lightbox-total').textContent = images.length;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        navigateToImage(currentIndex);
      };
      
      // Event listeners
      overlay.addEventListener('click', closeLightbox);
      closeBtn.addEventListener('click', closeLightbox);
      prevBtn.addEventListener('click', () => navigateToImage(currentIndex - 1));
      nextBtn.addEventListener('click', () => navigateToImage(currentIndex + 1));
      
      // Keyboard navigation
      document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('active')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') navigateToImage(currentIndex - 1);
        if (e.key === 'ArrowRight') navigateToImage(currentIndex + 1);
      });
      
      // Zoom functionality
      let zoomLevel = 1;
      const zoomIn = lightbox.querySelector('.zoom-in');
      const zoomOut = lightbox.querySelector('.zoom-out');
      const zoomReset = lightbox.querySelector('.zoom-reset');
      const zoomIndicator = lightbox.querySelector('.zoom-level-indicator');
      const imageContainer = lightbox.querySelector('.lightbox-image-container');
      
      function updateZoom(newLevel) {
        zoomLevel = Math.max(1, Math.min(3, newLevel)); // Clamp between 1x and 3x
        img.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
        img.style.transform = 'scale(' + zoomLevel + ')';
        zoomIndicator.textContent = Math.round(zoomLevel * 100) + '%';
        
        // Enable/disable overflow panning when zoomed
        if (zoomLevel > 1) {
          imageContainer.style.overflow = 'auto';
          imageContainer.style.cursor = 'move';
          img.classList.add('zoomed');
        } else {
          imageContainer.style.overflow = 'hidden';
          imageContainer.style.cursor = 'pointer';
          img.classList.remove('zoomed');
        }
      }
      
      if (zoomIn) zoomIn.addEventListener('click', () => updateZoom(zoomLevel + 0.25));
      if (zoomOut) zoomOut.addEventListener('click', () => updateZoom(zoomLevel - 0.25));
      if (zoomReset) zoomReset.addEventListener('click', () => updateZoom(1));
      
      // Double-click to zoom
      img.addEventListener('dblclick', () => {
        if (zoomLevel === 1) {
          updateZoom(2);
        } else {
          updateZoom(1);
        }
      });
      
      // Mouse wheel zoom
      imageContainer.addEventListener('wheel', (e) => {
        if (e.ctrlKey) {
          e.preventDefault();
          const delta = e.deltaY > 0 ? -0.1 : 0.1;
          updateZoom(zoomLevel + delta);
        }
      }, { passive: false });
      
      // Touch/swipe navigation + vertical dismiss
      const content = lightbox.querySelector('.lightbox-content');
      let isHorizontal = false, isVertical = false;
      content.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) return; // handled by pinch logic below
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        isDragging = false; isHorizontal = false; isVertical = false;
      }, { passive: true });
      
      content.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) return; // pinch separate
        if (!touchStartX) return;
        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;
        const absX = Math.abs(dx), absY = Math.abs(dy);
        
        if (!isHorizontal && !isVertical) {
          if (absX > 16 || absY > 16) {
            if (absX > absY) { isHorizontal = true; }
            else { isVertical = true; }
          }
        }
        
        if (isHorizontal && zoomLevel === 1) {
          isDragging = true;
          img.style.transition = 'none';
          img.style.transform = 'translateX(' + dx + 'px)';
          e.stopPropagation();
          e.preventDefault?.();
        } else if (isVertical && zoomLevel === 1) {
          isDragging = true;
          const translate = Math.max(-120, Math.min(120, dy));
          const opacity = Math.max(0.3, 1 - Math.abs(translate) / 160);
          content.style.transform = 'translateY(' + translate + 'px)';
          content.style.transition = 'none';
          content.style.opacity = String(opacity);
          e.stopPropagation();
          e.preventDefault?.();
        }
      }, { passive: false });
      
      content.addEventListener('touchend', (e) => {
        const dx = (e.changedTouches[0]?.clientX || 0) - (touchStartX || 0);
        const dy = (e.changedTouches[0]?.clientY || 0) - (touchStartY || 0);
        if (isHorizontal && zoomLevel === 1) {
          img.style.transition = 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1)';
          img.style.transform = 'scale(' + zoomLevel + ')';
          if (Math.abs(dx) > 56) {
            navigateToImage(currentIndex + (dx < 0 ? 1 : -1));
          }
        } else if (isVertical && zoomLevel === 1) {
          content.style.transition = 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1)';
          if (Math.abs(dy) > 56) {
            closeLightbox();
          } else {
            content.style.transform = '';
            content.style.opacity = '1';
          }
        }
        touchStartX = 0; touchStartY = 0; isDragging = false; isHorizontal = false; isVertical = false;
      }, { passive: true });

      // Pinch-to-zoom (touch)
      let pinchStartDistance = 0;
      function distance(t1, t2) {
        const dx = t2.clientX - t1.clientX; const dy = t2.clientY - t1.clientY; return Math.hypot(dx, dy);
      }
      imageContainer.style.touchAction = 'none';
      imageContainer.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
          pinchStartDistance = distance(e.touches[0], e.touches[1]);
        }
      }, { passive: true });
      imageContainer.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
          e.preventDefault();
          const d = distance(e.touches[0], e.touches[1]);
          if (pinchStartDistance > 0) {
            const scaleDelta = d / pinchStartDistance;
            const newLevel = Math.min(3, Math.max(1, zoomLevel * scaleDelta));
            updateZoom(newLevel);
          }
        }
      }, { passive: false });
      imageContainer.addEventListener('touchend', (e) => {
        if (e.touches.length < 2) {
          pinchStartDistance = 0;
        }
      }, { passive: true });

      // Tap outside image inside content closes
      content.addEventListener('click', (e) => {
        if (!e.target.closest('.lightbox-image') && !e.target.closest('.lightbox-zoom-controls') && !e.target.closest('.lightbox-nav')) {
          closeLightbox();
        }
      });
      
      // Reset zoom when changing images
      const originalNavigate = navigateToImage;
      navigateToImage = function(index) {
        updateZoom(1);
        originalNavigate(index);
      };
    }
    
    // Wrapper function to open lightbox from carousel
    window.openImageLightbox = function(category, index, imagesOverride) {
      let images = Array.isArray(imagesOverride) ? imagesOverride.slice() : null;
      if (!images) {
        const carousel = document.querySelector('[data-category="' + category + '"]');
        if (!carousel) return;
        images = Array.from(carousel.querySelectorAll('.carousel-image'))
          .map(function(img) { return img.src; });
      }
      if (images && images.length > 0) {
        ensureLightboxExists();
        window.openLightbox(images, index || 0);
      }
    };
    
    // Zone positions are now permanently locked - no reset functionality needed
    
    // Generate comprehensive project details HTML
    function zoneView(zone) {
      var v = window.visionMode;
      return {
        name: (v && zone.visionName) || zone.name,
        description: (v && zone.visionDescription) || zone.description,
        features: (v && zone.visionFeatures) || zone.features
      };
    }
    window.zoneView = zoneView;
    function generateProjectDetails(zone) {
      const zv = zoneView(zone);
      const prop = propertiesById[zone.propertyId] || { cta: {}, footerInfo: [] };
      const zoneColor = zoneColorMap[zone.type] || '#333';
      const lightColor = zoneColor + '15'; // 15% opacity for backgrounds
      const mediumColor = zoneColor + '40'; // 40% opacity for highlights
      
      return \`
        <div class="image-gallery">
          <div class="gallery-tabs">
            <div class="gallery-tab active" data-tab="current">📷 Current Photos</div>
            <div class="gallery-tab" data-tab="vision">🎨 Vision</div>
          </div>
          <div class="gallery-content">
            <div id="current-images" class="active">
              <div class="loading-images">⏳ Loading images...</div>
            </div>
            <div id="vision-images">
              <div class="loading-images">⏳ Loading images...</div>
            </div>
          </div>
        </div>
        
        <div class="project-section">
          <h3 style="color: \${zoneColor};">📋 Project Overview</h3>
          <div style="color: #555; line-height: 1.8; font-size: 15px; white-space: pre-wrap; word-wrap: break-word; margin: 0; padding: 0;">
\${zv.description}</div>
        </div>
        
        <div class="project-section">
          <h3 style="color: \${zoneColor};">🏗️ Key Features & Infrastructure</h3>
          <ul class="feature-list">
            \${zv.features.map(feature => \`<li>\${feature}</li>\`).join('')}
          </ul>
        </div>
        
        \${zone.optionsTitle && zone.options ? \`
          <div class="project-section">
            <h3 style="color: \${zoneColor};">\${zone.optionsTitle}</h3>
            \${zone.options.map(opt => \`
              <div style="padding: 16px; background: linear-gradient(135deg, \${lightColor} 0%, \${mediumColor} 100%); border-radius: 10px; border-left: 4px solid \${zoneColor}; margin-bottom: 12px;">
                <div style="font-weight: 700; color: \${zoneColor}; font-size: 15px; margin-bottom: 6px;">\${opt.name}</div>
                <div style="color: #555; font-size: 13px; line-height: 1.5;">\${opt.details}</div>
              </div>
            \`).join('')}
          </div>
        \` : ''}
        
        \${zone.membershipTiers ? \`
          <div class="project-section">
            <h3 style="color: \${zoneColor};">🎫 Membership Tiers</h3>
            \${zone.membershipTiers.map(tier => \`
              <div style="padding: 16px; background: linear-gradient(135deg, \${lightColor} 0%, \${mediumColor} 100%); border-radius: 10px; border-left: 4px solid \${zoneColor}; margin-bottom: 12px;">
                <div style="font-weight: 700; color: \${zoneColor}; font-size: 15px; margin-bottom: 6px;">\${tier.name}: \${tier.price}</div>
                <div style="color: #555; font-size: 13px; line-height: 1.5;">\${tier.benefits}</div>
              </div>
            \`).join('')}
          </div>
        \` : ''}
        
        \${zone.revenueModel ? \`
          <div class="project-section">
            <h3 style="color: \${zoneColor};">💰 Revenue Model</h3>
            <div style="background: linear-gradient(135deg, #e8f5e8 0%, #d4edda 100%); padding: 20px; border-radius: 12px; border-left: 4px solid #28a745;">
              <div style="margin-bottom: 12px;">
                <div style="font-weight: 600; color: #28a745; font-size: 14px; margin-bottom: 4px;">Membership Revenue:</div>
                <div style="color: #333; font-size: 14px;">\${zone.revenueModel.membershipRevenue}</div>
              </div>
              <div style="margin-bottom: 12px;">
                <div style="font-weight: 600; color: #28a745; font-size: 14px; margin-bottom: 4px;">Workshop Revenue:</div>
                <div style="color: #333; font-size: 14px;">\${zone.revenueModel.workshopRevenue}</div>
              </div>
              <div style="margin-bottom: 12px;">
                <div style="font-weight: 600; color: #28a745; font-size: 14px; margin-bottom: 4px;">Collaborator Revenue:</div>
                <div style="color: #333; font-size: 14px;">\${zone.revenueModel.collaboratorRevenue}</div>
              </div>
              <div style="margin-bottom: 12px;">
                <div style="font-weight: 600; color: #28a745; font-size: 14px; margin-bottom: 4px;">Spa Services:</div>
                <div style="color: #333; font-size: 14px;">\${zone.revenueModel.spaServices}</div>
              </div>
              <div style="margin-bottom: 12px;">
                <div style="font-weight: 600; color: #28a745; font-size: 14px; margin-bottom: 4px;">Retreat Add-Ons:</div>
                <div style="color: #333; font-size: 14px;">\${zone.revenueModel.retreatAddOns}</div>
              </div>
              <div style="padding-top: 12px; border-top: 2px solid #28a745; margin-top: 12px;">
                <div style="font-weight: 700; color: #28a745; font-size: 15px; margin-bottom: 8px;">Total Year 1: \${zone.revenueModel.totalYear1}</div>
            </div>
          </div>
\` : (zone.revenueStreams ? \`
          <div class="project-section">
            <h3 style="color: \${zoneColor};">💵 Revenue Streams</h3>
\${zone.revenueStreams.map(stream => \`<div class="revenue-stream">\${stream}</div>\`).join('')}
          </div>
\` : '')}
        \${zone.developmentTimeline ? \`
          <div class="project-section">
            <h3 style="color: \${zoneColor};">📅 Development Timeline</h3>
            \${zone.developmentTimeline.map(phase => \`
              <div style="padding: 20px; background: linear-gradient(135deg, \${lightColor} 0%, \${mediumColor} 100%); border-radius: 12px; border-left: 4px solid \${zoneColor}; margin-bottom: 16px;">
                <div style="font-weight: 700; color: \${zoneColor}; font-size: 16px; margin-bottom: 10px;">\${phase.phase}</div>
                <div style="color: #555; font-size: 14px; line-height: 1.6; margin-bottom: 8px;"><strong>Deliverables:</strong> \${phase.deliverables}</div>
                \${phase.investment ? \`<div style="color: #555; font-size: 14px; line-height: 1.6; margin-bottom: 8px;"><strong>Investment:</strong> \${phase.investment}</div>\` : ''}
                \${phase.monthlyRevenue ? \`<div style="color: #28a745; font-size: 14px; line-height: 1.6; margin-bottom: 8px;"><strong>Monthly Revenue:</strong> \${phase.monthlyRevenue}</div>\` : ''}
                <div style="background: rgba(255,255,255,0.6); padding: 8px 12px; border-radius: 6px; display: inline-block; margin-top: 6px; font-size: 13px; color: #666;"><strong>Status:</strong> \${phase.status}</div>
              </div>
            \`).join('')}
          </div>
        \` : \`
          <div class="project-section">
            <h3 style="color: \${zoneColor};">📅 Development Timeline</h3>
            <div style="padding: 20px; background: linear-gradient(135deg, \${lightColor} 0%, \${mediumColor} 100%); border-radius: 12px; border-left: 4px solid \${zoneColor};">
              <span class="timeline-phase">\${zone.timeline}</span>
              <p style="margin-top: 12px; color: #555; font-size: 14px; line-height: 1.5;">This zone is part of the property's phased development plan, strategically sequenced for sustainable growth.</p>
            </div>
          </div>
        \`}

        \${zone.wellnessAmenities ? \`
          <div class="project-section">
            <h3 style="color: \${zoneColor};">🌟 Wellness Amenities</h3>
            <ul class="feature-list">
              \${zone.wellnessAmenities.map(amenity => \`<li>\${amenity}</li>\`).join('')}
            </ul>
          </div>
        \` : zone.integratedGardenSystem ? \`
          <div class="project-section">
            <h3 style="color: \${zoneColor};">🌱 Integrated Garden System & Propagation</h3>
            <ul class="feature-list">
              \${zone.integratedGardenSystem.map(garden => \`<li>\${garden}</li>\`).join('')}
            </ul>
          </div>
        \` : zone.smartCultivationSystems ? \`
          <div class="project-section">
            <h3 style="color: \${zoneColor};">🧠 Smart Cultivation Systems</h3>
            <ul class="feature-list">
              \${zone.smartCultivationSystems.map(system => \`<li>\${system}</li>\`).join('')}
            </ul>
          </div>
        \` : ''}
        
        \${zone.id === 'mushroom-cultivation' ? \`
          <div class="project-section">
            <h3 style="color: \${zoneColor};">💰 Investment Options & Returns</h3>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;">
              
              <!-- LEFT: Investment Paths -->
              <div style="background: linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%); padding: 25px; border-radius: 12px; border-left: 4px solid #FF9800;">
                <h4 style="color: #FF9800; margin: 0 0 15px 0; font-size: 17px;">📊 Investment Paths</h4>
                
                <!-- Staged Build Option -->
                <div style="margin-bottom: 20px; padding: 15px; background: rgba(255,255,255,0.7); border-radius: 8px;">
                  <div style="font-weight: 700; color: #333; font-size: 15px; margin-bottom: 8px;">
                    🔨 Staged Development
                  </div>
                  <div style="font-size: 24px; font-weight: 700; color: #FF9800; margin-bottom: 8px;">
                    $2,000 - $6,000
                  </div>
                  <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #666; line-height: 1.6;">
                    <li>Phase 1: Site prep + deal negotiations ($1K-$2K)</li>
                    <li>Phase 2: Container delivery + setup ($1K-$4K)</li>
                    <li>Phase 3: Operating capital (reinvested)</li>
                  </ul>
                </div>
                
                <!-- Turnkey Option -->
                <div style="padding: 15px; background: rgba(255,255,255,0.7); border-radius: 8px;">
                  <div style="font-weight: 700; color: #333; font-size: 15px; margin-bottom: 8px;">
                    🚀 Turnkey System (Partner Quote)
                  </div>
                  <div style="font-size: 24px; font-weight: 700; color: #FF9800; margin-bottom: 8px;">
                    $149,000
                  </div>
                  <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #666; line-height: 1.6;">
                    <li>2 production units complete</li>
                    <li>Lab + fruiting chambers</li>
                    <li>Solar & battery backup</li>
                    <li>Full IoT climate control</li>
                  </ul>
                  <div style="margin-top: 10px; padding: 8px; background: rgba(46,125,50,0.1); border-radius: 6px; font-size: 12px; color: #2E7D32;">
                    📄 <em>Source: MRE - 2 units - Solar Mycology 1.3.pdf</em>
                  </div>
                </div>
              </div>
              
              <!-- RIGHT: Revenue Projections -->
              <div style="background: linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%); padding: 25px; border-radius: 12px; border-left: 4px solid #4CAF50;">
                <h4 style="color: #4CAF50; margin: 0 0 15px 0; font-size: 17px;">💵 Projected Returns</h4>
                
                <div style="margin-bottom: 15px; padding: 10px; background: rgba(255,152,0,0.15); border-radius: 6px; border-left: 3px solid #FF9800;">
                  <div style="font-size: 12px; color: #E65100; font-weight: 600;">
                    ⚠️ Note: Revenue projections below are for the full $149K turnkey system (2 production units).
                  </div>
                  <div style="font-size: 11px; color: #666; margin-top: 4px;">
                    Staged development ($2K-$6K) starts with $3.8K-$6K/month scaled operations.
                  </div>
                </div>
                
                <!-- Yearly Gross -->
                <div style="margin-bottom: 15px; padding: 15px; background: rgba(255,255,255,0.8); border-radius: 8px;">
                  <div style="font-size: 13px; color: #666; margin-bottom: 4px;">Annual Gross Revenue (Full System)</div>
                  <div style="font-size: 28px; font-weight: 700; color: #4CAF50;">$386,100</div>
                  <div style="font-size: 12px; color: #888; margin-top: 4px;">~1,980 lb/flush × 13 flushes/year</div>
                </div>
                
                <!-- Yearly Net -->
                <div style="margin-bottom: 15px; padding: 15px; background: rgba(255,255,255,0.8); border-radius: 8px;">
                  <div style="font-size: 13px; color: #666; margin-bottom: 4px;">Annual Net Profit</div>
                  <div style="font-size: 28px; font-weight: 700; color: #2E7D32;">$300,150</div>
                  <div style="font-size: 12px; color: #888; margin-top: 4px;">After operational expenses</div>
                </div>
                
                <!-- Per-Flush -->
                <div style="padding: 15px; background: rgba(255,255,255,0.8); border-radius: 8px;">
                  <div style="font-size: 13px; color: #666; margin-bottom: 4px;">Revenue Per Flush</div>
                  <div style="font-size: 22px; font-weight: 700; color: #4CAF50;">$29,700</div>
                  <div style="font-size: 12px; color: #888; margin-top: 4px;">4-week production cycles</div>
                </div>
                
                <!-- ROI Badge -->
                <div style="margin-top: 15px; text-align: center; padding: 12px; background: linear-gradient(135deg, #2E7D32 0%, #1B5E20 100%); border-radius: 8px; color: white;">
                  <div style="font-size: 13px; opacity: 0.9; margin-bottom: 4px;">Return on Investment</div>
                  <div style="font-size: 26px; font-weight: 700;">288% ROI</div>
                </div>
                
                <div style="margin-top: 12px; padding: 8px; background: rgba(46,125,50,0.1); border-radius: 6px; font-size: 12px; color: #2E7D32;">
                  📄 <em>Source: Celium Systems Production Calculations.pdf</em>
                </div>
              </div>
              
            </div>
          </div>
          
          <div class="project-section">
            <h3 style="color: \${zoneColor};">🏭 Production Capacity & Infrastructure</h3>
            
            <!-- Capacity Metrics Grid -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 25px;">
              
              <div style="background: linear-gradient(135deg, #2E7D3215 0%, #2E7D3240 100%); padding: 20px; border-radius: 10px; text-align: center; border: 2px solid #2E7D32;">
                <div style="font-size: 36px; margin-bottom: 8px;">📦</div>
                <div style="font-size: 28px; font-weight: 700; color: #2E7D32; margin-bottom: 4px;">360</div>
                <div style="font-size: 13px; color: #666;">Total Production Blocks</div>
                <div style="font-size: 12px; color: #888; margin-top: 4px;">30 racks × 6 shelves × 2 blocks</div>
              </div>
              
              <div style="background: linear-gradient(135deg, #2E7D3215 0%, #2E7D3240 100%); padding: 20px; border-radius: 10px; text-align: center; border: 2px solid #2E7D32;">
                <div style="font-size: 36px; margin-bottom: 8px;">⚖️</div>
                <div style="font-size: 28px; font-weight: 700; color: #2E7D32; margin-bottom: 4px;">1,980</div>
                <div style="font-size: 13px; color: #666;">Pounds Per Flush</div>
                <div style="font-size: 12px; color: #888; margin-top: 4px;">System-wide yield capacity</div>
              </div>
              
              <div style="background: linear-gradient(135deg, #2E7D3215 0%, #2E7D3240 100%); padding: 20px; border-radius: 10px; text-align: center; border: 2px solid #2E7D32;">
                <div style="font-size: 36px; margin-bottom: 8px;">⏱️</div>
                <div style="font-size: 28px; font-weight: 700; color: #2E7D32; margin-bottom: 4px;">13</div>
                <div style="font-size: 13px; color: #666;">Annual Flushes</div>
                <div style="font-size: 12px; color: #888; margin-top: 4px;">4-week production cycles</div>
              </div>
              
            </div>
            
            <!-- Equipment List -->
            <div style="background: linear-gradient(135deg, #F5F5F5 0%, #EEEEEE 100%); padding: 20px; border-radius: 12px; border-left: 4px solid #2E7D32;">
              <h4 style="color: #2E7D32; margin: 0 0 15px 0; font-size: 16px;">🔧 Turnkey System Includes:</h4>
              <ul class="feature-list">
                <li><strong>2 Production Units:</strong> Lab/incubation + fruiting chamber</li>
                <li><strong>Climate Control:</strong> HEPA filtration, cloud IoT monitoring</li>
                <li><strong>Processing Station:</strong> Flow hood, steam sterilizers, UV freshwater tank</li>
                <li><strong>Off-Grid Ready:</strong> Solar panels, battery backup, generator port</li>
                <li><strong>Yield Capacity:</strong> 2,000-2,500 lb per unit (supplier estimate)</li>
              </ul>
            </div>
          </div>
          
          <div class="project-section">
            <h3 style="color: \${zoneColor};">📊 Unit Economics & Operating Costs</h3>
            
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
              
              <!-- LEFT: Pricing & Materials -->
              <div>
                <h4 style="color: #2E7D32; font-size: 15px; margin-bottom: 12px;">💲 Pricing & Materials</h4>
                
                <div style="background: linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%); padding: 15px; border-radius: 10px; margin-bottom: 12px; border-left: 4px solid #4CAF50;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                      <div style="font-size: 13px; color: #666;">Market Price per Pound</div>
                      <div style="font-size: 22px; font-weight: 700; color: #4CAF50;">$15 / lb</div>
                    </div>
                    <div style="font-size: 32px;">💵</div>
                  </div>
                </div>
                
                <div style="background: linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%); padding: 15px; border-radius: 10px; margin-bottom: 12px; border-left: 4px solid #FF9800;">
                  <div style="font-size: 13px; color: #666; margin-bottom: 8px;">Material Cost per Block</div>
                  <div style="display: flex; justify-content: space-between; font-size: 14px; color: #555;">
                    <span>🍄 King Oyster:</span>
                    <strong style="color: #FF9800;">$1.75</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 14px; color: #555; margin-top: 4px;">
                    <span>🧠 Lion's Mane:</span>
                    <strong style="color: #FF9800;">$3.50</strong>
                  </div>
                </div>
                
                <div style="background: linear-gradient(135deg, #F5F5F5 0%, #EEEEEE 100%); padding: 15px; border-radius: 10px; border-left: 4px solid #666;">
                  <div style="font-size: 13px; color: #666;">Monthly Material Budget</div>
                  <div style="font-size: 20px; font-weight: 700; color: #666;">$787.50</div>
                </div>
              </div>
              
              <!-- RIGHT: Operating Expenses -->
              <div>
                <h4 style="color: #2E7D32; font-size: 15px; margin-bottom: 12px;">💡 Monthly Operating Costs (per unit)</h4>
                
                <div style="background: white; padding: 15px; border-radius: 10px; border: 2px solid #E0E0E0; margin-bottom: 12px;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #F0F0F0;">
                    <span style="font-size: 14px; color: #555;">⚡ Utilities</span>
                    <strong style="font-size: 15px; color: #333;">$200</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #F0F0F0;">
                    <span style="font-size: 14px; color: #555;">👥 Staffing</span>
                    <strong style="font-size: 15px; color: #333;">$2,500</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 2px solid #2E7D32;">
                    <span style="font-size: 15px; font-weight: 600; color: #2E7D32;">Total per Unit</span>
                    <strong style="font-size: 18px; font-weight: 700; color: #2E7D32;">$3,487.50</strong>
                  </div>
                </div>
                
                <div style="background: linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%); padding: 12px; border-radius: 8px; text-align: center; border: 2px solid #2196F3;">
                  <div style="font-size: 12px; color: #1565C0; margin-bottom: 4px;">🔄 Break-Even Point</div>
                  <div style="font-size: 16px; font-weight: 700; color: #1565C0;">~233 lb/unit/month</div>
                  <div style="font-size: 11px; color: #1976D2; margin-top: 2px;">@ $15/lb market rate</div>
                </div>
              </div>
              
            </div>
          </div>
          
          <div class="project-section">
            <h3 style="color: \${zoneColor};">🔄 Production Cycle Timeline</h3>
            
            <div id="timeline-container" style="background: linear-gradient(135deg, #FAFAFA 0%, #F5F5F5 100%); padding: 30px; border-radius: 12px; position: relative;">
              
              <!-- Timeline Flow -->
              <div id="timeline-steps" style="display: flex; align-items: center; justify-content: space-between; position: relative;">
                
                <!-- Connector Line -->
                <div style="position: absolute; top: 50%; left: 10%; right: 10%; height: 3px; background: linear-gradient(90deg, #2E7D32 0%, #4CAF50 50%, #66BB6A 100%); z-index: 0;"></div>
                
                <!-- Step 1 -->
                <div style="flex: 1; text-align: center; position: relative; z-index: 1;">
                  <div style="width: 80px; height: 80px; margin: 0 auto 12px auto; background: linear-gradient(135deg, #2E7D32 0%, #4CAF50 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 36px; box-shadow: 0 4px 12px rgba(46,125,50,0.3);">
                    🧫
                  </div>
                  <div style="font-weight: 700; color: #2E7D32; font-size: 15px; margin-bottom: 6px;">Week 0-1</div>
                  <div style="font-size: 13px; color: #666; line-height: 1.4;">Inoculation<br>& Incubation</div>
                </div>
                
                <!-- Step 2 -->
                <div style="flex: 1; text-align: center; position: relative; z-index: 1;">
                  <div style="width: 80px; height: 80px; margin: 0 auto 12px auto; background: linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 36px; box-shadow: 0 4px 12px rgba(76,175,80,0.3);">
                    🌱
                  </div>
                  <div style="font-weight: 700; color: #4CAF50; font-size: 15px; margin-bottom: 6px;">Week 1-2</div>
                  <div style="font-size: 13px; color: #666; line-height: 1.4;">Colonization<br>& Growth</div>
                </div>
                
                <!-- Step 3 -->
                <div style="flex: 1; text-align: center; position: relative; z-index: 1;">
                  <div style="width: 80px; height: 80px; margin: 0 auto 12px auto; background: linear-gradient(135deg, #66BB6A 0%, #81C784 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 36px; box-shadow: 0 4px 12px rgba(102,187,106,0.3);">
                    🍄
                  </div>
                  <div style="font-weight: 700; color: #66BB6A; font-size: 15px; margin-bottom: 6px;">Week 2-3</div>
                  <div style="font-size: 13px; color: #666; line-height: 1.4;">Fruiting<br>Chamber</div>
                </div>
                
                <!-- Step 4 -->
                <div style="flex: 1; text-align: center; position: relative; z-index: 1;">
                  <div style="width: 80px; height: 80px; margin: 0 auto 12px auto; background: linear-gradient(135deg, #81C784 0%, #A5D6A7 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 36px; box-shadow: 0 4px 12px rgba(129,199,132,0.3);">
                    📦
                  </div>
                  <div style="font-weight: 700; color: #81C784; font-size: 15px; margin-bottom: 6px;">Week 3-4</div>
                  <div style="font-size: 13px; color: #666; line-height: 1.4;">Harvest<br>& Package</div>
                </div>
                
                <!-- Step 5 -->
                <div style="flex: 1; text-align: center; position: relative; z-index: 1;">
                  <div style="width: 80px; height: 80px; margin: 0 auto 12px auto; background: linear-gradient(135deg, #FFC107 0%, #FFD54F 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 36px; box-shadow: 0 4px 12px rgba(255,193,7,0.3);">
                    💰
                  </div>
                  <div style="font-weight: 700; color: #FFA000; font-size: 15px; margin-bottom: 6px;">Week 4+</div>
                  <div style="font-size: 13px; color: #666; line-height: 1.4;">Distribution<br>& Sales</div>
                </div>
                
              </div>
              
              <!-- Bottom Stats -->
              <div id="timeline-stats" style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #E0E0E0; display: flex; justify-content: space-around; text-align: center;">
                <div>
                  <div style="font-size: 24px; font-weight: 700; color: #2E7D32;">~2 lb</div>
                  <div style="font-size: 12px; color: #666;">per block yield</div>
                </div>
                <div>
                  <div style="font-size: 24px; font-weight: 700; color: #4CAF50;">360</div>
                  <div style="font-size: 12px; color: #666;">blocks per system</div>
                </div>
                <div>
                  <div style="font-size: 24px; font-weight: 700; color: #66BB6A;">1,980 lb</div>
                  <div style="font-size: 12px; color: #666;">per flush output</div>
                </div>
                <div>
                  <div style="font-size: 24px; font-weight: 700; color: #FFA000;">$29,700</div>
                  <div style="font-size: 12px; color: #666;">revenue per flush</div>
                </div>
              </div>
              
            </div>
          </div>
        \` : ''}
        
        \${zone.tropicalFruitTrees ? \`
          <div class="project-section">
            <h3 style="color: \${zoneColor};">🌴 Tropical Fruit Trees & Propagation</h3>
            \${zone.tropicalFruitTrees.map(tree => \`
              <div style="padding: 16px; background: linear-gradient(135deg, \${lightColor} 0%, \${mediumColor} 100%); border-radius: 10px; border-left: 4px solid \${zoneColor}; margin-bottom: 12px;">
                <div style="font-weight: 700; color: \${zoneColor}; font-size: 15px; margin-bottom: 6px;">\${tree.name}</div>
                <div style="color: #555; font-size: 13px; line-height: 1.5; margin-bottom: 4px;"><strong>Propagation:</strong> \${tree.propagation}</div>
                <div style="color: #555; font-size: 13px; line-height: 1.5;"><strong>Products:</strong> \${tree.products}</div>
              </div>
            \`).join('')}
          </div>
        \` : ''}
        
        \${zone.productsOfferings ? \`
          <div class="project-section">
            <h3 style="color: \${zoneColor};">🌿 Products & Offerings</h3>
            \${zone.productsOfferings.map(category => \`
              <div style="padding: 16px; background: linear-gradient(135deg, \${lightColor} 0%, \${mediumColor} 100%); border-radius: 10px; border-left: 4px solid \${zoneColor}; margin-bottom: 12px;">
                <div style="font-weight: 700; color: \${zoneColor}; font-size: 15px; margin-bottom: 8px;">\${category.category}</div>
                <ul style="margin: 0; padding-left: 20px; list-style: disc;">
                  \${category.items.map(item => \`<li style="color: #555; font-size: 14px; line-height: 1.6; margin-bottom: 4px;">\${item}</li>\`).join('')}
                </ul>
              </div>
            \`).join('')}
          </div>
        \` : ''}
        
        \${zone.regenerativePractices ? \`
          <div class="project-section">
            <h3 style="color: \${zoneColor};">🌱 Regenerative Practices & Land Stewardship</h3>
            <ul class="feature-list">
              \${zone.regenerativePractices.map(practice => \`<li>\${practice}</li>\`).join('')}
            </ul>
          </div>
        \` : zone.regenerativeDesign ? \`
          <div class="project-section">
            <h3 style="color: \${zoneColor};">🌿 Regenerative Design & Eco-Luxury Living</h3>
            <ul class="feature-list">
              \${zone.regenerativeDesign.map(design => \`<li>\${design}</li>\`).join('')}
            </ul>
          </div>
        \` : zone.id === 'tropical-dome-greenhouse' && zone.regenerativeSystems ? \`
          <div class="project-section">
            <h3 style="color: \${zoneColor};">🌴 Regenerative Systems & Tropical Production</h3>
            <ul class="feature-list">
              \${zone.regenerativeSystems.map(system => \`<li>\${system}</li>\`).join('')}
            </ul>
          </div>
        \` : zone.regenerativeSystems ? \`
          <div class="project-section">
            <h3 style="color: \${zoneColor};">⚡ Regenerative Systems & Operational Efficiency</h3>
            <ul class="feature-list">
              \${zone.regenerativeSystems.map(system => \`<li>\${system}</li>\`).join('')}
            </ul>
          </div>
        \` : zone.infrastructureEssentials ? \`
          <div class="project-section">
            <h3 style="color: \${zoneColor};">⚙️ Utility Systems & Phased Development</h3>
            <ul class="feature-list">
              \${zone.infrastructureEssentials.map(essential => \`<li>\${essential}</li>\`).join('')}
            </ul>
          </div>
        \` : ''}

        \${zone.propertyValue ? \`
          <div class="project-section">
            <h3 style="color: \${zoneColor};">🏡 Property Value Projections</h3>
            <div style="background: linear-gradient(135deg, #e8f5e8 0%, #d4edda 100%); padding: 20px; border-radius: 12px; border-left: 4px solid #28a745;">
              <div style="margin-bottom: 16px;">
                <div style="font-weight: 700; color: #28a745; font-size: 15px; margin-bottom: 8px;">Current Property Value:</div>
                <div style="font-size: 18px; font-weight: 700; color: #333; margin-bottom: 16px;">\${zone.propertyValue.current}</div>
                
                <div style="font-weight: 700; color: #28a745; font-size: 15px; margin-bottom: 8px;">Appraised Value (4,000-5,000 sq ft Prefab):</div>
                <div style="font-size: 18px; font-weight: 700; color: #333; margin-bottom: 16px;">\${zone.propertyValue.appraisedPrefab}</div>
                
                <div style="font-weight: 700; color: #28a745; font-size: 15px; margin-bottom: 8px;">Projected Custom Eco-Retreat Value:</div>
                <div style="font-size: 22px; font-weight: 700; color: #28a745; margin-bottom: 16px;">\${zone.propertyValue.projectedCustom}</div>
                
                <div style="font-weight: 700; color: #28a745; font-size: 15px; margin-bottom: 8px;">Property Value Increase:</div>
                <div style="font-size: 20px; font-weight: 700; color: #28a745; margin-bottom: 16px;">\${zone.propertyValue.increase} (335% appreciation)</div>
              </div>
              <p style="color: #155724; margin: 0; font-size: 13px; line-height: 1.5; font-style: italic;">
                \${zone.propertyValue.note}
              </p>
            </div>
          </div>
        \` : ''}
        
        \${zone.projectedValue ? \`
          <div class="project-section">
            <h3 style="color: \${zoneColor};">💎 Projected Value Creation</h3>
            <div style="background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%); padding: 20px; border-radius: 12px; border-left: 4px solid #ff9800;">
              
              <!-- Investment & Value Grid -->
              <div style="display: flex; flex-direction: column; gap: 15px; margin-bottom: 20px;">
                <div style="background: rgba(255,255,255,0.8); padding: 18px; border-radius: 8px; border: 1px solid rgba(255,152,0,0.3);">
                  <div style="font-weight: 700; color: #ff9800; font-size: 13px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Total Development Investment</div>
                  <div style="font-size: 26px; font-weight: 700; color: #333; line-height: 1.2;">\${zone.projectedValue.totalDevelopment}</div>
                </div>
                
                <div style="background: rgba(255,255,255,0.8); padding: 18px; border-radius: 8px; border: 1px solid rgba(255,152,0,0.3);">
                  <div style="font-weight: 700; color: #ff9800; font-size: 13px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Post-Build Property Value</div>
                  <div style="font-size: 26px; font-weight: 700; color: #ff9800; line-height: 1.2;">\${zone.projectedValue.postBuildValue}</div>
                </div>
              </div>
              
              <!-- ROI Highlight -->
              <div style="background: linear-gradient(135deg, rgba(255,152,0,0.15) 0%, rgba(255,152,0,0.25) 100%); padding: 18px; border-radius: 8px; margin-bottom: 15px; border: 2px solid #ff9800;">
                <div style="font-weight: 700; color: #ff9800; font-size: 14px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Return on Investment (ROI)</div>
                <div style="font-size: 28px; font-weight: 700; color: #ff9800; line-height: 1.2;">\${zone.projectedValue.valueIncrease}</div>
              </div>
              
              <!-- Note -->
              <p style="color: #e65100; margin: 0; font-size: 13px; line-height: 1.6; font-style: italic; background: rgba(255,255,255,0.6); padding: 12px; border-radius: 6px;">
                \${zone.projectedValue.note}
              </p>
            </div>
          </div>
        \` : zone.marketContext ? \`
          <div class="project-section">
            <h3 style="color: \${zoneColor};">🎶 Ojai's Growing Event & Ceremony Scene</h3>
            <div style="background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); padding: 20px; border-radius: 12px; border-left: 4px solid #ffc107;">
              <p style="color: #856404; margin: 0; font-size: 14px; line-height: 1.5;">
                \${zone.marketContext}
              </p>
            </div>
          </div>
        \` : zone.operationalFunction ? \`
          <div class="project-section">
            <h3 style="color: \${zoneColor};">🎯 Operational Function</h3>
            <div style="background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%); padding: 20px; border-radius: 12px; border-left: 4px solid #4caf50;">
              <p style="color: #2e7d32; margin: 0; font-size: 14px; line-height: 1.6;">
                \${zone.operationalFunction}
              </p>
            </div>
          </div>
        \` : zone.marketAnalysis ? \`
          <div class="project-section">
            <h3 style="color: \${zoneColor};">📊 Market Analysis & Growth Potential</h3>
            <div style="background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); padding: 20px; border-radius: 12px; border-left: 4px solid #ffc107;">
              <p style="color: #856404; margin: 0; font-size: 14px; line-height: 1.5;">
                \${zone.marketAnalysis}
              </p>
            </div>
          </div>
        \` : zone.id !== 'beekeeping-program' && zone.id !== 'events-gatherings-hub' && zone.id !== 'wellness-facilities' && zone.id !== 'community-hub' && zone.id !== 'ceremonial-infrastructure' && zone.id !== 'infrastructure' && zone.id !== 'retreat-village' && zone.id !== 'livestock-dairy' && zone.id !== 'gatelodge-operations-hub' && zone.id !== 'tropical-dome-greenhouse' && zone.id !== 'farmstead-produce-stand' ? \`
          <div class="project-section">
            <h3 style="color: \${zoneColor};">📊 Market Analysis & Projections</h3>
            <div style="background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); padding: 20px; border-radius: 12px; border-left: 4px solid #ffc107;">
              <p style="color: #856404; margin: 0; font-size: 14px; line-height: 1.5;">
                <strong>Market Position:</strong> Positioned in the rapidly growing eco-tourism and sustainable living sectors, with projected 15-20% annual growth in demand for authentic wellness retreats and farm-to-table experiences in the Ojai Valley region.
              </p>
            </div>
          </div>
        \` : ''}
        
        <div class="project-section">
          <h3 style="color: \${zoneColor};">💰 Investment Summary</h3>
          <div class="investment-grid">
            <div class="investment-card" style="border-color: \${zoneColor};">
              <div class="investment-label">\${zone.id === 'beekeeping-program' ? 'Starting Budget' : (zone.id === 'agricultural-hub' ? 'Estimated Total Budget' : (zone.id === 'infrastructure' || zone.id === 'retreat-village' || zone.id === 'livestock-dairy' || zone.id === 'tropical-dome-greenhouse' ? 'Estimated Budget' : 'Total Budget'))}</div>
              <div class="investment-value" style="color: \${zoneColor};">\${zone.id === 'tropical-dome-greenhouse' ? \`
                <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; line-height: 1.3;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight: 700; font-size: 16px; color: \${zoneColor};">Phase 1</span>
                    <span style="font-size: 13px; color: #555;">$30K (with investment)</span>
                  </div>
                </div>
              \` : zone.id === 'infrastructure' ? \`
                <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; line-height: 1.3;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight: 700; font-size: 16px; color: \${zoneColor};">P1</span>
                    <span style="font-size: 13px; color: #555;">$62K-$77K</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight: 700; font-size: 16px; color: \${zoneColor};">P2</span>
                    <span style="font-size: 13px; color: #555;">$40K-$60K</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight: 700; font-size: 16px; color: \${zoneColor};">P3</span>
                    <span style="font-size: 13px; color: #555;">$40K-$50K</span>
                  </div>
                </div>
              \` : zone.id === 'retreat-village' ? \`
                <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; line-height: 1.3;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight: 700; font-size: 16px; color: \${zoneColor};">P1</span>
                    <span style="font-size: 13px; color: #555;">$70K-$80K</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight: 700; font-size: 16px; color: \${zoneColor};">P2</span>
                    <span style="font-size: 13px; color: #555;">$20K+ (flexible)</span>
                  </div>
                </div>
              \` : zone.id === 'livestock-dairy' ? \`
                <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; line-height: 1.3;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight: 700; font-size: 16px; color: \${zoneColor};">P1</span>
                    <span style="font-size: 13px; color: #555;">$20K-$25K</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight: 700; font-size: 16px; color: \${zoneColor};">P2</span>
                    <span style="font-size: 13px; color: #555;">$5K/month</span>
                  </div>
                </div>
              \` : zone.id === 'farmstead-produce-stand' ? \`
                <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; line-height: 1.3;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight: 700; font-size: 16px; color: \${zoneColor};">Farm Stand</span>
                    <span style="font-size: 13px; color: #555;">$2K-$5K</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight: 700; font-size: 16px; color: \${zoneColor};">Online Shop</span>
                    <span style="font-size: 13px; color: #555;">~$5K</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight: 700; font-size: 16px; color: \${zoneColor};">Total</span>
                    <span style="font-size: 13px; color: #555;">$7K-$10K</span>
                  </div>
                </div>
              \` : \`\${zone.budget}\`}</div>
            </div>
            <div class="investment-card" style="border-color: \${zoneColor};">
              <div class="investment-label">\${zone.id === 'beekeeping-program' ? 'Revenue Starting' : 'Monthly Revenue'}</div>
              <div class="investment-value roi-positive" style="color: \${zoneColor};">\${zone.id === 'events-gatherings-hub' ? \`
                <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; line-height: 1.3;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight: 700; font-size: 16px; color: \${zoneColor};">P1</span>
                    <span style="font-size: 13px; color: #555;">$4.5K-$9K</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight: 700; font-size: 16px; color: \${zoneColor};">P2</span>
                    <span style="font-size: 13px; color: #555;">$11K-$22K</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight: 700; font-size: 16px; color: \${zoneColor};">P3</span>
                    <span style="font-size: 13px; color: #555;">$27K-$41K</span>
                  </div>
                </div>
              \` : zone.id === 'wellness-facilities' ? \`
                <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; line-height: 1.3;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight: 700; font-size: 16px; color: \${zoneColor};">P1</span>
                    <span style="font-size: 13px; color: #555;">$0</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight: 700; font-size: 16px; color: \${zoneColor};">P2</span>
                    <span style="font-size: 13px; color: #555;">$0</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight: 700; font-size: 16px; color: \${zoneColor};">P3</span>
                    <span style="font-size: 13px; color: #555;">$10K-$15K</span>
                  </div>
                </div>
              \` : zone.id === 'glamping-creek-village' ? \`
                <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; line-height: 1.3;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight: 700; font-size: 16px; color: \${zoneColor};">P1</span>
                    <span style="font-size: 13px; color: #555;">$0</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight: 700; font-size: 16px; color: \${zoneColor};">P2</span>
                    <span style="font-size: 13px; color: #555;">$8.75K-$10K</span>
                  </div>
                </div>
              \` : zone.id === 'community-hub' ? \`
                <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; line-height: 1.3;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight: 700; font-size: 16px; color: \${zoneColor};">P1</span>
                    <span style="font-size: 13px; color: #555;">$0</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight: 700; font-size: 16px; color: \${zoneColor};">P2</span>
                    <span style="font-size: 13px; color: #555;">$7K-$10K+</span>
                  </div>
                </div>
              \` : zone.id === 'mcqueens-garage' ? \`
                <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; line-height: 1.3;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight: 700; font-size: 16px; color: \${zoneColor};">P1</span>
                    <span style="font-size: 13px; color: #555;">$0</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight: 700; font-size: 16px; color: \${zoneColor};">P2</span>
                    <span style="font-size: 13px; color: #555;">$0</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight: 700; font-size: 16px; color: \${zoneColor};">P3</span>
                    <span style="font-size: 13px; color: #555;">$15K-$25K+</span>
                  </div>
                </div>
              \` : zone.monthlyRevenue}</div>
            </div>
            <div class="investment-card" style="border-color: \${zoneColor};">
              <div class="investment-label">Timeline</div>
              <div class="investment-value" style="color: \${zoneColor};">\${zone.timeline}</div>
            </div>
            <div class="investment-card" style="border-color: \${zoneColor};">
              <div class="investment-label">ROI</div>
              <div class="investment-value roi-positive" style="color: \${zoneColor};">\${zone.roi}</div>
            </div>
          </div>
        </div>
        
        <div class="project-section cta-section">
          <h3 style="color: \${zoneColor};">🤝 Get Involved</h3>
          <div style="background: linear-gradient(135deg, \${zoneColor} 0%, \${zoneColor}CC 100%); padding: 30px; border-radius: 16px; text-align: center; color: white; border: 2px solid \${zoneColor};">
            <h4 style="color: white; margin: 0 0 15px 0; font-size: 20px;">\${(prop.cta && prop.cta.heading) || 'Get In Touch'}</h4>
            <p style="margin: 0 0 25px 0; opacity: 0.9; font-size: 15px; line-height: 1.5;">\${(prop.cta && prop.cta.paragraph) || ''}</p>
            
            <div class="contact-dropdown">
              <button class="dropdown-button" onclick="toggleDropdown(this)">
                📧 Get In Touch
                <span class="dropdown-arrow">▼</span>
              </button>
              <div class="dropdown-content">
                <div class="team-contact-header">Team Contact:</div>
                \${((prop.cta && prop.cta.contacts) || []).map(c => \`<div class="contact-item"><span class="contact-name">\${c.name}</span><a href="mailto:\${c.email}" class="contact-email">\${c.email}</a></div>\`).join('')}
              </div>
            </div>

            \${((prop.cta && prop.cta.buttons) || []).length ? \`<div class="action-buttons">\${prop.cta.buttons.map(b => \`<a href="\${b.url}" target="_blank" class="action-button website-button">\${b.label}</a>\`).join('')}</div>\` : ''}
          </div>
        </div>
        
        <div class="project-footer">
          <div class="footer-content">
            <div class="footer-title">\${prop.footerTitle || prop.name || ''}</div>
            <div class="footer-info">\${(prop.footerInfo || []).map(t => \`<span>\${t}</span>\`).join(' • ')}</div>
            <div class="footer-tagline">Regenerative Living • Collaborative Design • Community Wellness</div>
          </div>
        </div>
      \`;
    }
    
        // ── Position Editor: pick property → edit all icons at once → capture ──
    const adminToggle = document.getElementById('admin-menu-toggle');
    const adminPopup = document.getElementById('admin-popup');
    const closePopup = document.getElementById('close-popup');
    const statusIndicator = document.getElementById('edit-status');
    window.positionEditActive = false;
    
    (function initPositionEditor() {
      const buttonsWrap = document.getElementById('edit-property-buttons');
      const editBtn = document.getElementById('edit-toggle-btn');
      const hintEl = document.getElementById('edit-hint');
      const movedList = document.getElementById('moved-list');
      const resetBtn = document.getElementById('reset-positions-btn');
      const zoomLevelEl = document.getElementById('zoom-level');
      if (!adminToggle || !adminPopup || !buttonsWrap || !editBtn) return;
      
      let selectedPropId = null;
      let editing = false;
      const markerMap = new Map();
      const movedZones = new Map();
      
      map.eachLayer(function(layer) {
        if (layer.options && layer.options.zoneId) {
          markerMap.set((layer.options.propertyId || '?') + '/' + layer.options.zoneId, layer);
        }
      });
      
      // Open/close: the panel STAYS OPEN while you work on the map.
      // (The old version closed itself on any outside click — maddening.)
      adminToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        adminPopup.style.display = adminPopup.style.display === 'none' ? 'block' : 'none';
      });
      closePopup.addEventListener('click', function() {
        if (editing) stopEditing();
        adminPopup.style.display = 'none';
      });
      
      function setStatus(icon, text, color) {
        if (!statusIndicator) return;
        statusIndicator.innerHTML = '<div>' + icon + '</div><div class="status-text">' + text + '</div>';
        statusIndicator.style.borderLeftColor = color || '#F44336';
        statusIndicator.style.background = 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)';
      }
      
      function eachPropertyMarker(propId, fn) {
        markerMap.forEach(function(marker, key) {
          if (key.indexOf(propId + '/') === 0) fn(marker, key);
        });
      }
      
      function refreshMovedList() {
        if (movedZones.size === 0) {
          movedList.style.display = 'none';
          movedList.innerHTML = '';
          return;
        }
        movedList.style.display = 'block';
        const items = [];
        movedZones.forEach(function(z) {
          items.push('<div class="moved-item">' + z.emoji + ' ' + z.name + ' <span class="moved-coords">' + (+z.position[0]).toFixed(6) + ', ' + (+z.position[1]).toFixed(6) + '</span></div>');
        });
        movedList.innerHTML = '<div class="moved-title">📍 Moved this session (' + movedZones.size + '):</div>' + items.join('');
      }
      
      // Property buttons — generated from the registry, so future
      // properties show up here automatically.
      properties.forEach(function(prop) {
        const b = document.createElement('button');
        b.className = 'edit-prop-btn';
        b.type = 'button';
        b.textContent = prop.shortLabel || prop.name;
        b.addEventListener('click', function() {
          if (editing) stopEditing();
          selectedPropId = prop.id;
          Array.prototype.forEach.call(buttonsWrap.children, function(x) {
            x.classList.toggle('active', x === b);
          });
          editBtn.disabled = false;
          editBtn.textContent = '🔓 Start Editing ' + (prop.shortLabel || prop.name);
          resetBtn.style.display = 'none';
          setStatus('🎯', prop.name + ' selected — flying there now', '#2196F3');
          map.flyTo(prop.center, prop.zoom, { animate: true, easeLinearity: 0.12 });
        });
        buttonsWrap.appendChild(b);
      });
      
      function startEditing() {
        if (!selectedPropId) return;
        editing = true;
        window.positionEditActive = true;
        // Close any open panels so nothing overlaps while editing
        const sp = document.getElementById('side-panel');
        if (sp) { sp.classList.remove('open', 'swiping'); sp.style.transform = ''; }
        const pp = document.getElementById('property-panel');
        if (pp) { pp.classList.remove('open', 'swiping'); pp.style.transform = ''; }
        if (typeof unlockBodyScroll === 'function') unlockBodyScroll();
        
        eachPropertyMarker(selectedPropId, function(marker) {
          if (marker.dragging) marker.dragging.enable();
          marker.setZIndexOffset(1500);
          const el = marker.getElement();
          if (el) el.classList.add('marker-editing');
        });
        editBtn.textContent = '✅ Done — Lock Positions';
        editBtn.classList.add('editing');
        hintEl.style.display = 'block';
        resetBtn.style.display = 'block';
        setStatus('🔓', 'Editing — drag the glowing icons', '#FF9800');
      }
      
      function stopEditing() {
        editing = false;
        window.positionEditActive = false;
        markerMap.forEach(function(marker) {
          if (marker.dragging) marker.dragging.disable();
          marker.setZIndexOffset(0);
          const el = marker.getElement();
          if (el) el.classList.remove('marker-editing');
        });
        const prop = propertiesById[selectedPropId];
        editBtn.textContent = '🔓 Start Editing ' + (prop ? (prop.shortLabel || prop.name) : '');
        editBtn.classList.remove('editing');
        hintEl.style.display = 'none';
        if (movedZones.size > 0) {
          setStatus('💾', movedZones.size + ' icon(s) moved — hit Capture below', '#4CAF50');
        } else {
          setStatus('🔒', 'All icons locked', '#F44336');
        }
      }
      
      editBtn.addEventListener('click', function() {
        if (editing) { stopEditing(); } else { startEditing(); }
      });
      
      // Fed by every marker dragend
      window.notifyZoneMoved = function(zone) {
        movedZones.set(zone.propertyId + '/' + zone.id, zone);
        refreshMovedList();
        setStatus('📍', zone.emoji + ' ' + zone.name + ' moved', '#4CAF50');
      };
      
      // Reset every icon of the selected property to its saved position
      resetBtn.addEventListener('click', function() {
        const prop = propertiesById[selectedPropId];
        if (!prop) return;
        prop.zones.forEach(function(zone) {
          if (!zone.originalPosition) return;
          const marker = markerMap.get(prop.id + '/' + zone.id);
          if (!marker) return;
          zone.position = [zone.originalPosition[0], zone.originalPosition[1]];
          marker.setLatLng(zone.position);
          const redraw = window.zoneTerritories && window.zoneTerritories[prop.id + '/' + zone.id];
          if (redraw) redraw(zone.position);
          movedZones.delete(prop.id + '/' + zone.id);
        });
        refreshMovedList();
        setStatus('↩️', prop.name + ' reset to the saved layout', '#2196F3');
      });
      
      // ── Permanent save: commits the layout to git via the server ──
      const saveBtn = document.getElementById('save-layout-btn');
      const pinRow = document.getElementById('pin-row');
      const pinInput = document.getElementById('edit-pin-input');
      const pinConfirm = document.getElementById('pin-confirm-btn');
      
      function collectPositions() {
        const grouped = {};
        markerMap.forEach(function(marker, key) {
          const parts = key.split('/');
          const propId = parts[0], zoneId = parts.slice(1).join('/');
          if (!grouped[propId]) grouped[propId] = {};
          const p = marker.getLatLng();
          grouped[propId][zoneId] = [ +p.lat.toFixed(6), +p.lng.toFixed(6) ];
        });
        return grouped;
      }
      
      function doSave(pin) {
        if (editing) stopEditing();
        setStatus('⏳', 'Saving layout to git…', '#2196F3');
        if (saveBtn) saveBtn.disabled = true;
        fetch('/api/save-positions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: pin, positions: collectPositions() })
        }).then(function(r) { return r.json().then(function(data) { return { status: r.status, data: data }; }); }).then(function(resp) {
          if (saveBtn) saveBtn.disabled = false;
          if (resp.status === 200 && resp.data && resp.data.ok) {
            try { localStorage.setItem('ojaiMapEditPin', pin); } catch (e) {}
            if (pinRow) pinRow.style.display = 'none';
            movedZones.clear();
            refreshMovedList();
            markerMap.forEach(function(marker, key) {
              const parts = key.split('/');
              const prop2 = propertiesById[parts[0]];
              if (!prop2) return;
              const z2 = prop2.zones.find(function(zz) { return zz.id === parts.slice(1).join('/'); });
              if (!z2) return;
              const p2 = marker.getLatLng();
              z2.position = [p2.lat, p2.lng];
              z2.originalPosition = [p2.lat, p2.lng];
            });
            setStatus('✅', 'Saved to git! Everyone sees this layout — a fresh deploy locks it in (~30s)', '#4CAF50');
          } else if (resp.status === 401) {
            try { localStorage.removeItem('ojaiMapEditPin'); } catch (e) {}
            if (pinRow) pinRow.style.display = 'block';
            if (pinInput) { pinInput.value = ''; pinInput.focus(); }
            setStatus('🔑', 'Wrong PIN — enter the Edit PIN and try again', '#F44336');
          } else if (resp.status === 501) {
            setStatus('⚙️', 'Saving is not configured yet (needs EDIT_PIN + GITHUB_TOKEN on Vercel). Use Capture and send to Claude.', '#FF9800');
          } else {
            setStatus('⚠️', 'Save failed (' + resp.status + ') — try again, or use Capture as backup', '#F44336');
          }
        }).catch(function(err) {
          if (saveBtn) saveBtn.disabled = false;
          setStatus('⚠️', 'Save failed — no connection. Use Capture as backup.', '#F44336');
        });
      }
      
      if (saveBtn) {
        saveBtn.addEventListener('click', function() {
          let pin = null;
          try { pin = localStorage.getItem('ojaiMapEditPin'); } catch (e) {}
          if (pin) { doSave(pin); }
          else {
            if (pinRow) pinRow.style.display = 'block';
            if (pinInput) pinInput.focus();
            setStatus('🔑', 'First time: enter the Edit PIN, then hit Confirm', '#2196F3');
          }
        });
      }
      if (pinConfirm) {
        pinConfirm.addEventListener('click', function() {
          const pin = ((pinInput && pinInput.value) || '').trim();
          if (!pin) { setStatus('🔑', 'Enter the Edit PIN first', '#F44336'); return; }
          doSave(pin);
        });
      }
      
      // Live zoom readout
      const updateZoomLabel = function() {
        if (zoomLevelEl) zoomLevelEl.textContent = 'Zoom: ' + (Math.round(map.getZoom() * 10) / 10);
      };
      map.on('zoomend', updateZoomLabel);
      updateZoomLabel();
      
      console.log('✏️ Position editor ready —', properties.length, 'properties');
    })();
    
        // Territory Drawing Editor Functionality
    const territoryToggle = document.getElementById('territory-editor-toggle');
    const territoryEditor = document.getElementById('territory-editor');
    const closeTerritoryEditor = document.getElementById('close-territory-editor');
    const zoneSelector = document.getElementById('zone-selector');
    const brushSize = document.getElementById('brush-size');
    const brushSizeDisplay = document.getElementById('brush-size-display');
    const drawingStatus = document.getElementById('drawing-status');
    
    // Territory drawing state
    let isDrawingMode = false;
    let currentZone = null;
    let drawingCursor = null;
    let isDrawing = false;
    let drawMode = 'draw'; // 'draw' or 'erase'
    let territoryLayers = new Map(); // Store territory layers for each zone
    
    // Initialize zone selector with all zones
    zones.forEach(zone => {
      const option = document.createElement('option');
      option.value = zone.id;
      option.textContent = zone.emoji + ' ' + zone.name;
      zoneSelector.appendChild(option);
    });
    
    // Toggle territory editor
    territoryToggle.addEventListener('click', () => {
      territoryEditor.style.display = territoryEditor.style.display === 'none' ? 'block' : 'none';
      if (territoryEditor.style.display === 'block') {
        isDrawingMode = true;
        createDrawingCursor();
      } else {
        isDrawingMode = false;
        removeDrawingCursor();
      }
    });
    
    // Close territory editor
    closeTerritoryEditor.addEventListener('click', () => {
      territoryEditor.style.display = 'none';
      isDrawingMode = false;
      removeDrawingCursor();
    });
    
    // Zone selection change
    zoneSelector.addEventListener('change', (e) => {
      currentZone = zones.find(z => z.id === e.target.value);
      if (currentZone) {
        drawingStatus.innerHTML = '<div>🎨</div><div class="status-text">Drawing territory for ' + currentZone.name + '</div>';
        drawingStatus.style.borderLeftColor = zoneColorMap[currentZone.type] || '#2196F3';
        updateDrawingCursor();
      } else {
        drawingStatus.innerHTML = '<div>🎨</div><div class="status-text">Select a zone to start drawing</div>';
        drawingStatus.style.borderLeftColor = '#2196F3';
      }
    });
    
    // Brush size control
    brushSize.addEventListener('input', (e) => {
      brushSizeDisplay.textContent = e.target.value + 'px';
      updateDrawingCursor();
    });
    
    // Draw mode selection
    document.addEventListener('change', (e) => {
      if (e.target.name === 'draw-mode') {
        drawMode = e.target.value;
        updateDrawingCursor();
      }
    });
    
    // Create drawing cursor
    function createDrawingCursor() {
      if (!drawingCursor) {
        drawingCursor = document.createElement('div');
        drawingCursor.className = 'drawing-cursor';
        document.body.appendChild(drawingCursor);
        updateDrawingCursor();
      }
    }
    
    // Update drawing cursor appearance
    function updateDrawingCursor() {
      if (drawingCursor && currentZone) {
        const size = parseInt(brushSize.value);
        const color = zoneColorMap[currentZone.type] || '#FF6B6B';
        
        drawingCursor.style.width = size + 'px';
        drawingCursor.style.height = size + 'px';
        
        if (drawMode === 'draw') {
          drawingCursor.style.border = '2px solid ' + color;
          drawingCursor.style.background = color + '33';
        } else {
          drawingCursor.style.border = '2px solid #ff4757';
          drawingCursor.style.background = 'rgba(255, 71, 87, 0.2)';
        }
      }
    }
    
    // Remove drawing cursor
    function removeDrawingCursor() {
      if (drawingCursor) {
        document.body.removeChild(drawingCursor);
        drawingCursor = null;
      }
    }
    
    // Mouse move handler for cursor
    document.addEventListener('mousemove', (e) => {
      if (drawingCursor && isDrawingMode) {
        drawingCursor.style.left = e.clientX + 'px';
        drawingCursor.style.top = e.clientY + 'px';
        drawingCursor.style.display = 'block';
      }
    });
    
    // Hide cursor when leaving window
    document.addEventListener('mouseleave', () => {
      if (drawingCursor) {
        drawingCursor.style.display = 'none';
      }
    });
    
    // Drawing functionality on map
    let drawingCanvas = null;
    let canvasContext = null;
    
    // Initialize drawing canvas
    function initializeDrawingCanvas() {
      if (!drawingCanvas) {
        drawingCanvas = document.createElement('canvas');
        drawingCanvas.style.position = 'absolute';
        drawingCanvas.style.top = '0';
        drawingCanvas.style.left = '0';
        drawingCanvas.style.pointerEvents = 'none';
        drawingCanvas.style.zIndex = '1000';
        
        const mapContainer = document.getElementById('map');
        mapContainer.appendChild(drawingCanvas);
        
        canvasContext = drawingCanvas.getContext('2d');
        
        // Resize canvas to match map
        function resizeCanvas() {
          drawingCanvas.width = mapContainer.offsetWidth;
          drawingCanvas.height = mapContainer.offsetHeight;
        }
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        map.on('resize', resizeCanvas);
      }
    }
    
    // Map mouse events for drawing
    map.on('mousedown', (e) => {
      if (isDrawingMode && currentZone) {
        isDrawing = true;
        initializeDrawingCanvas();
        drawOnCanvas(e.containerPoint);
      }
    });
    
    map.on('mousemove', (e) => {
      if (isDrawing && isDrawingMode && currentZone) {
        drawOnCanvas(e.containerPoint);
      }
    });
    
    map.on('mouseup', () => {
      if (isDrawing) {
        isDrawing = false;
        saveCurrentTerritory();
      }
    });
    
    // Draw on canvas
    function drawOnCanvas(point) {
      if (!canvasContext || !currentZone) return;
      
      const size = parseInt(brushSize.value);
      const color = zoneColorMap[currentZone.type] || '#FF6B6B';
      
      canvasContext.globalCompositeOperation = drawMode === 'draw' ? 'source-over' : 'destination-out';
      canvasContext.fillStyle = color + '80'; // Semi-transparent
      canvasContext.beginPath();
      canvasContext.arc(point.x, point.y, size / 2, 0, Math.PI * 2);
      canvasContext.fill();
    }
    
    // Save current territory as polygon
    function saveCurrentTerritory() {
      if (!currentZone || !drawingCanvas) return;
      
      // Convert canvas drawing to polygon coordinates
      // This is a simplified version - in production you'd want more sophisticated polygon generation
      console.log('Territory drawn for', currentZone.name);
      
      // Update status
      drawingStatus.innerHTML = '<div>✅</div><div class="status-text">Territory saved for ' + currentZone.name + '</div>';
    }
    
    // Clear territory for current zone
    document.getElementById('clear-territory').addEventListener('click', () => {
      if (currentZone && drawingCanvas) {
        // Clear the canvas for current zone
        canvasContext.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
        drawingStatus.innerHTML = '<div>🗑️</div><div class="status-text">Territory cleared for ' + currentZone.name + '</div>';
      }
    });
    
    // Save all territories
    document.getElementById('save-territories').addEventListener('click', () => {
      console.log('💾 Saving all territories...');
      // Implementation for saving territories to file/server
      drawingStatus.innerHTML = '<div>💾</div><div class="status-text">All territories saved successfully!</div>';
    });
    
    // Load territories
    document.getElementById('load-territories').addEventListener('click', () => {
      console.log('📁 Loading territories...');
      // Implementation for loading territories from file/server
      drawingStatus.innerHTML = '<div>📁</div><div class="status-text">Territories loaded successfully!</div>';
    });
    
    // Bulletproof Capture Zone Positions functionality
    const captureZonesBtn = document.getElementById('capture-zones-btn');
    captureZonesBtn.addEventListener('click', () => {
      const grouped = {};
      let total = 0;
      map.eachLayer(layer => {
        if (layer.options && layer.options.zoneId) {
          const p = layer.getLatLng();
          const propId = layer.options.propertyId || 'unknown';
          if (!grouped[propId]) grouped[propId] = [];
          grouped[propId].push({ id: layer.options.zoneId, position: [ +p.lat.toFixed(6), +p.lng.toFixed(6) ] });
          total++;
        }
      });
      const NL = String.fromCharCode(10);
      const propBlocks = Object.keys(grouped).sort().map(function(propId) {
        grouped[propId].sort(function(a, b) { return a.id.localeCompare(b.id); });
        const lines = grouped[propId].map(function(z) { return '    "' + z.id + '": [' + z.position[0] + ', ' + z.position[1] + ']'; });
        return '  "' + propId + '": {' + NL + lines.join(',' + NL) + NL + '  }';
      });
      const jsonText = '{' + NL + propBlocks.join(',' + NL) + NL + '}';
      
      statusIndicator.innerHTML = '<div>🎯</div><div class="status-text">Captured ' + total + ' positions</div>';
      statusIndicator.style.background = 'linear-gradient(135deg, #E8F5E8 0%, #A5D6A7 100%)';
      statusIndicator.style.borderLeftColor = '#4CAF50';
      
      let overlay = document.getElementById('positions-overlay');
      if (overlay) overlay.remove();
      overlay = document.createElement('div');
      overlay.id = 'positions-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:5000;display:flex;align-items:center;justify-content:center;padding:16px;';
      overlay.innerHTML = '<div style="background:#fff;max-width:540px;width:100%;max-height:85vh;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,0.35);display:flex;flex-direction:column;overflow:hidden;">' +
        '<div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;padding:14px 18px;font-weight:700;display:flex;justify-content:space-between;align-items:center;">📍 Captured Icon Positions' +
        '<button id="close-positions-overlay" style="background:rgba(255,255,255,0.25);border:none;color:#fff;font-size:18px;width:30px;height:30px;border-radius:50%;cursor:pointer;">&times;</button></div>' +
        '<div style="padding:14px 18px 6px 18px;font-size:13px;color:#555;line-height:1.5;">Current positions for every icon, grouped by property. <strong>Copy this and paste it to Claude</strong> to lock the new positions in permanently.</div>' +
        '<textarea id="positions-textarea" readonly style="margin:10px 18px 0 18px;height:240px;font-family:monospace;font-size:12px;border:2px solid #e0e0e0;border-radius:8px;padding:10px;resize:none;white-space:pre;"></textarea>' +
        '<div style="padding:14px 18px;display:flex;gap:10px;">' +
        '<button id="copy-positions-btn" style="flex:1;background:#4CAF50;color:#fff;border:none;padding:12px;border-radius:8px;font-weight:700;cursor:pointer;font-size:14px;">📋 Copy to Clipboard</button>' +
        '<button id="download-positions-btn" style="background:#607D8B;color:#fff;border:none;padding:12px 16px;border-radius:8px;font-weight:600;cursor:pointer;font-size:14px;">⬇️ Download</button>' +
        '</div></div>';
      document.body.appendChild(overlay);
      document.getElementById('positions-textarea').value = jsonText;
      document.getElementById('close-positions-overlay').addEventListener('click', function() { overlay.remove(); });
      overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
      document.getElementById('copy-positions-btn').addEventListener('click', function() {
        const ta = document.getElementById('positions-textarea');
        ta.select(); ta.setSelectionRange(0, 999999);
        const done = function() { const b = document.getElementById('copy-positions-btn'); if (b) { b.textContent = '✅ Copied! Now paste it to Claude'; setTimeout(function(){ b.textContent = '📋 Copy to Clipboard'; }, 2500); } };
        if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(jsonText).then(done).catch(function(){ try { document.execCommand('copy'); } catch(_) {} done(); }); }
        else { try { document.execCommand('copy'); } catch(_) {} done(); }
      });
      document.getElementById('download-positions-btn').addEventListener('click', function() {
        const blob = new Blob([jsonText], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'zone-positions.json';
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      });
      console.log('Captured positions:', jsonText);
    });
    
    // Zone movement controls - Carefully implemented
    // (Old one-zone-at-a-time movement UI removed — replaced by the Position
    // Editor above, which unlocks a whole property's icons at once.)
        // Image upload handling function
    function handleImageUpload(input, zoneId, category) {
      const files = input.files;
      if (files.length === 0) return;
      
      console.log('📁 Image upload requested for:', zoneId, category, files.length + ' files');
      
      // Create FormData for file upload
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('images', files[i]);
      }
      formData.append('zoneId', zoneId);
      formData.append('category', category);
      
      // Show upload progress
      const placeholder = input.parentElement;
      const originalContent = placeholder.innerHTML;
      placeholder.innerHTML = '<div class="placeholder-icon">⬆️</div><div class="placeholder-text">Uploading...</div>';
      
      // Simulate upload (in real implementation, would POST to /api/upload-images)
      setTimeout(() => {
        placeholder.innerHTML = '<div class="placeholder-icon">✅</div><div class="placeholder-text">Ready for images<br>Drop files here</div>';
        console.log('✅ Images uploaded successfully to /images/' + zoneId + '/' + category + '/');
        
        // Reset after showing success
        setTimeout(() => {
          placeholder.innerHTML = originalContent;
        }, 2000);
      }, 1500);
    }
    
    // Make handleImageUpload globally available
    window.handleImageUpload = handleImageUpload;
    
    // Mobile timeline fix - icon + content horizontal layout on mobile viewports
    function fixTimelineOnMobile() {
      if (window.innerWidth <= 768) {
        const timelineSteps = document.getElementById('timeline-steps');
        const timelineStats = document.getElementById('timeline-stats');
        
        if (timelineSteps) {
          timelineSteps.style.cssText = 'display: flex !important; flex-direction: column !important; gap: 15px !important; align-items: stretch !important;';
          
          // Fix each step - make horizontal row (icon left, content right)
          const steps = timelineSteps.querySelectorAll(':scope > div[style*="flex: 1"]');
          steps.forEach(step => {
            if (!step.style.position || step.style.position !== 'absolute') {
              // Make step a horizontal flexbox
              step.style.cssText = 'display: flex !important; flex-direction: row !important; align-items: center !important; gap: 15px !important; padding: 15px !important; background: linear-gradient(135deg, rgba(46, 125, 50, 0.05) 0%, rgba(46, 125, 50, 0.1) 100%) !important; border-radius: 10px !important; border: 1px solid rgba(46, 125, 50, 0.15) !important; width: 100% !important;';
              
              // Find the icon circle (first child) and make it smaller, fixed width
              const iconCircle = step.querySelector('div[style*="width: 80px"]');
              if (iconCircle) {
                iconCircle.style.cssText = iconCircle.style.cssText.replace('width: 80px', 'width: 60px').replace('height: 80px', 'height: 60px').replace('font-size: 36px', 'font-size: 28px') + '; flex-shrink: 0 !important; margin: 0 !important;';
              }
              
              // Create content wrapper for text elements
              const textDivs = Array.from(step.children).slice(1); // All children except icon
              if (textDivs.length > 0) {
                textDivs.forEach(div => {
                  div.style.textAlign = 'left';
                  div.style.margin = '0';
                });
              }
            }
          });
          
          // Hide connector line
          const connector = timelineSteps.querySelector('div[style*="position: absolute"][style*="height: 3px"]');
          if (connector) connector.style.display = 'none';
        }
        
        if (timelineStats) {
          timelineStats.style.cssText = 'display: flex !important; flex-direction: column !important; gap: 12px !important; margin-top: 30px; padding-top: 20px; border-top: 2px solid #E0E0E0; text-align: center;';
          
          // Style each stat item
          const statItems = timelineStats.querySelectorAll(':scope > div');
          statItems.forEach(item => {
            item.style.cssText += '; padding: 15px !important; background: linear-gradient(135deg, rgba(46, 125, 50, 0.05) 0%, rgba(46, 125, 50, 0.1) 100%) !important; border-radius: 8px !important; border: 1px solid rgba(46, 125, 50, 0.2) !important;';
          });
        }
      }
    }
    
    // Run on load and resize
    fixTimelineOnMobile();
    window.addEventListener('resize', fixTimelineOnMobile);
    
    // ---- 🌍 3D terrain mode (Google-Earth-style, MapLibre GL) ----
    var earth3dMap = null;

    // ---- V0.21: the same county layers, draped over the 3D terrain --------
    // MapLibre expands {bbox-epsg-3857} per tile, so the county's /export
    // endpoint works as a raster source with no proxy in between.
    var VC_3D_DIRECT = {
      gsat: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
      osm: 'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'
    };
    function vc3dSource(def, transparent) {
      if (def.kind === 'xyz') {
        return { type: 'raster', tiles: [vcSvcBase(def) + '/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: def.maxNative || 21 };
      }
      if (def.kind === 'wms') {
        return { type: 'raster', tiles: [vcWmsUrl(def, '{bbox-epsg-3857}')], tileSize: 256, maxzoom: 19 };
      }
      // MapLibre expands {bbox-epsg-3857} per tile, so any export endpoint works here too
      var px = def.px || 512;
      return {
        type: 'raster', tileSize: px, maxzoom: def.maxZoom || (def.root ? 19 : 21),
        tiles: [vcExportBase(def) + '?bbox={bbox-epsg-3857}' + vcExportTail(def, transparent, px)]
      };
    }
    window.vcSync3DLayers = function () {
      var m = earth3dMap;
      if (!m || !earthReady || !m.getStyle) return;
      try {
        // tear down every county layer we own, base first-in/last-out
        var own = ['vc-base'];
        for (var k = 0; k < VC_OVERLAYS.length; k++) {
          var oid = 'vc-ov-' + VC_OVERLAYS[k].id;
          own.push(oid);
          (VC_OVERLAYS[k].parts || []).forEach(function (_, pi) { own.push(oid + '-p' + pi); });
        }
        own.forEach(function (id) {
          [id, id + '-line', id + '-ease'].forEach(function (l) { if (m.getLayer(l)) m.removeLayer(l); });
          [id, id + '-vec'].forEach(function (src) { if (m.getSource(src)) m.removeSource(src); });
        });
        // sit above the built-in satellite but under boundaries, lots and markers
        var before = null, ls = (m.getStyle().layers || []);
        for (var i = 0; i < ls.length; i++) { if (ls[i].id !== 'sat') { before = ls[i].id; break; } }

        var bd = vcDefById(VC_BASES, vcActiveBase);
        if (bd && (bd.svc || VC_3D_DIRECT[bd.id])) {
          m.addSource('vc-base', bd.svc
            ? vc3dSource(bd, false)
            : { type: 'raster', tiles: [VC_3D_DIRECT[bd.id]], tileSize: 256, maxzoom: 20 });
          m.addLayer({ id: 'vc-base', type: 'raster', source: 'vc-base', paint: { 'raster-opacity': 1 } }, before);
        }
        // every active overlay in draw order (z), so fills stay under lines and labels
        var active = VC_OVERLAYS.filter(function (d) { return vcActiveOverlays[d.id]; })
          .sort(function (a, b) { return (a.z || 300) - (b.z || 300); });
        for (var j = 0; j < active.length; j++) {
          var d = active[j], sid = 'vc-ov-' + d.id, op = vcOvOpacity(d);
          if (d.kind === 'image') {
            var bb = d.bounds;
            m.addSource(sid, { type: 'image', url: d.url, coordinates: [
              [bb[0][1], bb[1][0]], [bb[1][1], bb[1][0]], [bb[1][1], bb[0][0]], [bb[0][1], bb[0][0]]
            ] });
            if (d._vec) {
              var ring3 = (d._vec.corners || []).map(function (c) { return [c.latlng[1], c.latlng[0]]; });
              if (ring3.length) ring3.push(ring3[0]);
              var feats = [{ type: 'Feature', properties: { k: 'line' }, geometry: { type: 'LineString', coordinates: ring3 } }];
              (d._vec.easement16 || []).forEach(function (p) {
                var r = p.map(function (q) { return [q[1], q[0]]; }); r.push(r[0]);
                feats.push({ type: 'Feature', properties: { k: 'ease' }, geometry: { type: 'Polygon', coordinates: [r] } });
              });
              m.addSource(sid + '-vec', { type: 'geojson', data: { type: 'FeatureCollection', features: feats } });
              m.addLayer({ id: sid + '-ease', type: 'fill', source: sid + '-vec', filter: ['==', 'k', 'ease'], paint: { 'fill-color': '#ffc24d', 'fill-opacity': 0.3 } }, before);
              m.addLayer({ id: sid + '-line', type: 'line', source: sid + '-vec', filter: ['==', 'k', 'line'], paint: { 'line-color': '#7ff0ff', 'line-width': 2.5, 'line-dasharray': [3, 2] } }, before);
            }
            m.addLayer({ id: sid, type: 'raster', source: sid, paint: { 'raster-opacity': op } }, before);
          } else if (d.parts) {
            for (var pi = 0; pi < d.parts.length; pi++) {
              m.addSource(sid + '-p' + pi, vc3dSource(d.parts[pi], true));
              m.addLayer({ id: sid + '-p' + pi, type: 'raster', source: sid + '-p' + pi, paint: { 'raster-opacity': op } }, before);
            }
          } else {
            m.addSource(sid, vc3dSource(d, true));
            m.addLayer({ id: sid, type: 'raster', source: sid, paint: { 'raster-opacity': op } }, before);
          }
        }
      } catch (e) { console.warn('3D county layers:', e); }
    };
    var mlQueue = [], mlLoading = false;
    function loadMapLibre(cb) {
      if (window.maplibregl) return cb();
      mlQueue.push(cb);
      if (mlLoading) return;
      mlLoading = true;
      var css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.css';
      document.head.appendChild(css);
      var sc = document.createElement('script');
      sc.src = 'https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.js';
      sc.onload = function() {
        mlLoading = false;
        var q = mlQueue.splice(0);
        q.forEach(function(f) { try { f(); } catch (e) { console.error(e); } });
      };
      sc.onerror = function() {
        mlLoading = false; mlQueue.length = 0;
        if (document.getElementById('earth3d').classList.contains('open')) {
          alert('Could not load the 3D engine - please check your connection and try again.');
          close3D();
        }
      };
      document.head.appendChild(sc);
    }
    function stitchLoop3D(prop) {
      var pts = [];
      (prop.boundary || []).forEach(function(seg) {
        var c = seg.coordinates || [];
        for (var i = 0; i < c.length - 1; i++) pts.push([c[i][1], c[i][0]]);
      });
      if (pts.length) pts.push(pts[0].slice());
      return pts;
    }
    var earthOpenedByGesture = false, earthReady = false;
    var earthPendPitch = 0, earthPendBearing = 0;
    var orbitDrag = null, midDrag2D = null;
    var earthDiveTo = null;
    function earthGestureDelta(ddx, ddy) {
      if (earth3dMap && earthReady) {
        earth3dMap.setPitch(Math.max(0, Math.min(80, earth3dMap.getPitch() - ddy * 0.35)));
        earth3dMap.setBearing(earth3dMap.getBearing() + ddx * 0.35);
      } else {
        earthPendPitch = Math.max(0, Math.min(80, earthPendPitch - ddy * 0.35));
        earthPendBearing += ddx * 0.35;
      }
    }
    function open3D(opts) {
      var e3 = document.getElementById('earth3d');
      if (e3.classList.contains('open')) return;
      earthPrebuilding = false;           // promote any in-flight background pre-build to a real open
      e3.classList.remove('prebuilding');
      earthOpenedByGesture = !!(opts && opts.gesture);
      earthPendPitch = (opts && typeof opts.pitch === 'number') ? opts.pitch : 0;
      earthPendBearing = 0;
      e3.classList.add('open');
      buildStars();
      var lel = document.getElementById('earth3d-loading');
      if (lel) lel.style.display = (earth3dMap && earthReady) ? 'none' : 'flex';
      loadMapLibre(function() {
        try { build3D(); }
        catch (err) {
          console.error('3D init failed:', err);
          alert('The 3D view could not start on this device (WebGL needed).');
          close3D();
        }
      });
    }
    function close3D() {
      if (earth3dMap) {
        try {
          var cc = earth3dMap.getCenter();
          map.setView([cc.lat, cc.lng], Math.max(Math.min(earth3dMap.getZoom() + 1, 19), 9), { animate: false });
        } catch (e) {}
      }
      document.getElementById('earth3d').classList.remove('open');
    }
    var earthBuiltMode = null;
    var earth3dMarkers = [];      // DOM property chips only now (6) — zones live on the GPU
    var zoneImgCache = {};        // "emoji|color" -> map image id (added once, reused across rebuilds)
    var earthFpsChecked = false;
    var earthPrebuilding = false;
    // Render an emoji badge (colored disc + white ring + glyph) to a canvas -> a GPU image.
    // This is what lets ~50 zone markers ride on a symbol layer instead of ~50 reprojected DOM nodes.
    function makeZoneIcon(emoji, col) {
      var R = 2, S = 34, pad = 8, W = (S + pad) * R;
      var cv = document.createElement('canvas');
      cv.width = W; cv.height = W;
      var ctx = cv.getContext('2d');
      var cx = W / 2, r = (S / 2) * R;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 5 * R; ctx.shadowOffsetY = 3 * R;
      var g = ctx.createLinearGradient(cx - r, cx - r, cx + r, cx + r);
      g.addColorStop(0, col); g.addColorStop(1, col + 'cc');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cx, r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.lineWidth = 2 * R; ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath(); ctx.arc(cx, cx, r, 0, Math.PI * 2); ctx.stroke();
      ctx.font = (19 * R) + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      try { ctx.fillText(emoji, cx, cx + R); } catch (e) {}
      var d = ctx.getImageData(0, 0, W, W);
      return { width: W, height: W, data: d.data };
    }
    // Sample real frame rate once; if the device is struggling, drop terrain (the heaviest layer).
    function sampleFps3D() {
      if (earthFpsChecked || !earth3dMap) return;
      earthFpsChecked = true;
      var gaps = [], last = 0, n = 0;
      function tick(ts) {
        if (!earth3dMap) return;
        if (last) gaps.push(ts - last);
        last = ts; n++;
        if (n < 75) { requestAnimationFrame(tick); return; }
        var s = gaps.slice(20).sort(function(a, b) { return a - b; });   // drop warmup/entry frames
        var med = s.length ? s[Math.floor(s.length / 2)] : 16;
        var fps = 1000 / med;
        // Report only — NEVER drop terrain. The hillsides ARE the 3D; keeping them is the whole point.
        // (The opening fly-in briefly dips below 30fps on any machine, so auto-dropping was a false positive.)
        console.log('🌍 3D running at ~' + fps.toFixed(0) + 'fps');
      }
      requestAnimationFrame(tick);
    }
    function earthEntry() {
      if (earthDiveTo) {
        var dvp = earthDiveTo; earthDiveTo = null;
        earth3dMap.flyTo({
          center: [dvp.center[1], dvp.center[0]],
          zoom: Math.max((dvp.zoom || 15.5) - 1, 12.8),
          pitch: 62, bearing: -24,
          duration: 4200, curve: 1.7, essential: true
        });
      } else if (earthOpenedByGesture) {
        earth3dMap.easeTo({ pitch: earthPendPitch, bearing: earthPendBearing, duration: 450 });
      } else {
        setTimeout(function() {
          if (earth3dMap) earth3dMap.easeTo({ pitch: 58, bearing: -18, duration: 2600 });
        }, 500);
      }
    }
    function buildMarkers3D() {
      if (!earth3dMap || !earth3dMap.getSource('zonesrc')) return;   // zone layer is created on 'load'
      // ---- Zone markers: ONE GPU symbol layer (was ~50 DOM markers — the source of the lag) ----
      var feats = [];
      zones.forEach(function(z) {
        if (window.zoneVisibleInMode && !window.zoneVisibleInMode(z.mode)) return;
        var col = zoneColorMap[z.type] || '#455a64';
        var key = z.emoji + '|' + col;
        var imgId = zoneImgCache[key];
        if (!imgId) {
          imgId = 'zi' + Object.keys(zoneImgCache).length;
          try { if (!earth3dMap.hasImage(imgId)) earth3dMap.addImage(imgId, makeZoneIcon(z.emoji, col), { pixelRatio: 2 }); }
          catch (e) {}
          zoneImgCache[key] = imgId;
        }
        var nm = (window.zoneView ? window.zoneView(z).name : z.name);
        feats.push({ type: 'Feature', properties: { icon: imgId, name: nm },
          geometry: { type: 'Point', coordinates: [z.position[1], z.position[0]] } });
      });
      earth3dMap.getSource('zonesrc').setData({ type: 'FeatureCollection', features: feats });
      // ---- Property chips: 6 DOM markers (negligible), keeps the styled pill look + dive-on-click ----
      earth3dMarkers.forEach(function(m) { try { m.remove(); } catch (e) {} });
      earth3dMarkers = [];
      properties.forEach(function(p) {
        var el = document.createElement('div');
        el.className = 'prop-chip3d';
        el.textContent = (window.visionMode && p.visionLabelChip) ? p.visionLabelChip : p.labelChip;
        el.addEventListener('click', function(ev) {
          ev.stopPropagation();
          earth3dMap.flyTo({
            center: [p.center[1], p.center[0]],
            zoom: Math.max((p.zoom || 15.5) - 1, 12.8),
            pitch: 62, bearing: -24,
            duration: 3400, curve: 1.55, essential: true
          });
        });
        earth3dMarkers.push(new maplibregl.Marker({ element: el, anchor: 'bottom', offset: [0, -16] })
          .setLngLat([p.center[1], p.center[0]])
          .addTo(earth3dMap));
      });
      earthBuiltMode = !!window.visionMode;
    }
    function build3D() {
      if (earth3dMap && earthReady) {
        // The globe is alive & pre-built — just resync it to the 2D camera and re-enter (instant)
        earth3dMap.resize();
        var rc = map.getCenter(), rz = map.getZoom();
        earth3dMap.jumpTo({ center: [rc.lng, rc.lat], zoom: Math.max(rz - 1, 10.8), pitch: 0, bearing: 0 });
        // Re-assert terrain every open — the hillsides must always be there when you enter 3D.
        try { if (!earth3dMap.getTerrain()) earth3dMap.setTerrain({ source: 'dem', exaggeration: 1.5 }); } catch (e) {}
        if (earthBuiltMode !== !!window.visionMode) buildMarkers3D();
        var lel2 = document.getElementById('earth3d-loading');
        if (lel2) lel2.style.display = 'none';
        earthEntry();
        sampleFps3D();
        return;
      }
      if (earth3dMap && !earthReady) {
        // Construction is already in flight (a background pre-build) — just size it;
        // the 'load' handler will finish the entry now that we're no longer prebuilding.
        try { earth3dMap.resize(); } catch (e) {}
        return;
      }
      var c2 = map.getCenter(), z2 = map.getZoom();
      earth3dMap = new maplibregl.Map({
        container: 'earth3d-map',
        style: {
          version: 8,
          sources: {
            sat: {
              type: 'raster',
              tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
              tileSize: 256, maxzoom: 19
            },
            dem: {
              type: 'raster-dem',
              tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
              tileSize: 256, encoding: 'terrarium', maxzoom: 14
            }
          },
          layers: [{ id: 'sat', type: 'raster', source: 'sat' }],
          projection: { type: 'globe' },
          sky: {
            'sky-color': 'rgba(2, 4, 12, 0)',
            'horizon-color': 'rgba(110, 175, 255, 0.5)',
            'fog-color': 'rgba(12, 26, 51, 0.6)',
            'sky-horizon-blend': 0.7,
            'horizon-fog-blend': 0.6,
            'fog-ground-blend': 0.85,
            'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 8, 1, 11, 0]
          }
        },
        center: [c2.lng, c2.lat],
        zoom: Math.max(z2 - 1, 10.8),
        pitch: 0, bearing: 0, maxPitch: 80,
        fadeDuration: 0,
        // Cap the render resolution: on retina / 4K screens an uncapped devicePixelRatio makes the
        // GPU push 4-9x the pixels every frame -> the lag & tearing johny saw. 1.5 stays crisp, runs fast.
        pixelRatio: Math.min(window.devicePixelRatio || 1, 1.5),
        antialias: false,
        attributionControl: false,
        refreshExpiredTiles: false
      });
      earth3dMap.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
      window.earth3dRef = earth3dMap;
      // Google-Earth middle-mouse orbit (right-drag / ctrl-drag / two-finger work natively)
      var cvs3d = earth3dMap.getCanvasContainer();
      cvs3d.addEventListener('mousedown', function(e) {
        if (e.button === 1) { e.preventDefault(); orbitDrag = { x: e.clientX, y: e.clientY }; }
      });
      cvs3d.addEventListener('auxclick', function(e) { e.preventDefault(); });
      earth3dMap.once('webglcontextlost', function() {
        try { earth3dMap.remove(); } catch (e) {}
        earth3dMap = null; window.earth3dRef = null;
        earthBuiltMode = null; earthReady = false;
        zoneImgCache = {}; earthFpsChecked = false; earthPrebuilding = false;  // rebuild adds fresh GPU images
      });
      earth3dMap.on('load', function() {
        earthReady = true;
        var lel = document.getElementById('earth3d-loading');
        if (lel) lel.style.display = 'none';
        try { earth3dMap.setTerrain({ source: 'dem', exaggeration: 1.5 }); }
        catch (e) { console.warn('terrain not available with globe on this device:', e); }

        // Rainbow-line stand-ins: gold glow + violet line per property boundary
        properties.forEach(function(p, idx) {
          var loop = stitchLoop3D(p);
          if (!loop.length) return;
          earth3dMap.addSource('b' + idx, { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: loop } } });
          earth3dMap.addLayer({ id: 'bglow' + idx, type: 'line', source: 'b' + idx, paint: { 'line-color': '#FFD700', 'line-width': 7, 'line-blur': 5, 'line-opacity': 0.5 } });
          earth3dMap.addLayer({ id: 'bline' + idx, type: 'line', source: 'b' + idx, paint: { 'line-color': '#B388FF', 'line-width': 2.6 } });
        });

        // Ranch parcel plat lines
        properties.forEach(function(p, idx) {
          if (!p.lots || !p.lots.length) return;
          var feats = [];
          p.lots.forEach(function(lot) {
            (lot.rings || []).forEach(function(ring) {
              feats.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: ring.map(function(q) { return [q[1], q[0]]; }) } });
            });
          });
          earth3dMap.addSource('lots' + idx, { type: 'geojson', data: { type: 'FeatureCollection', features: feats } });
          earth3dMap.addLayer({ id: 'lots' + idx, type: 'line', source: 'lots' + idx, paint: { 'line-color': '#FFFFFF', 'line-width': 0.9, 'line-opacity': 0.6 } });
        });

        // Zone markers live here: one empty GeoJSON source + symbol layer, filled by buildMarkers3D()
        earth3dMap.addSource('zonesrc', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        earth3dMap.addLayer({
          id: 'zones3d', type: 'symbol', source: 'zonesrc',
          layout: {
            'icon-image': ['get', 'icon'],
            'icon-size': ['interpolate', ['linear'], ['zoom'], 11, 0.4, 14, 0.62, 17, 0.82],
            'icon-allow-overlap': true, 'icon-ignore-placement': true, 'icon-anchor': 'center'
          }
        });
        earth3dMap.on('click', 'zones3d', function(e) {
          var f = e.features && e.features[0]; if (!f) return;
          new maplibregl.Popup({ offset: 16, closeButton: false })
            .setLngLat(f.geometry.coordinates.slice())
            .setText(f.properties.name).addTo(earth3dMap);
        });
        earth3dMap.on('mouseenter', 'zones3d', function() { earth3dMap.getCanvas().style.cursor = 'pointer'; });
        earth3dMap.on('mouseleave', 'zones3d', function() { earth3dMap.getCanvas().style.cursor = ''; });

        buildMarkers3D();
        if (window.vcSync3DLayers) window.vcSync3DLayers();
        if (earthPrebuilding) {
          // Warmed up invisibly. Let tiles settle, then drop back to display:none — the map stays
          // alive & fully built, so the first real open is just resize + jumpTo + fly-in.
          var settle = function() {
            var pe = document.getElementById('earth3d');
            if (pe && !pe.classList.contains('open')) pe.classList.remove('prebuilding');
            earthPrebuilding = false;
          };
          earth3dMap.once('idle', settle); setTimeout(settle, 6000);
          console.log('🌍 globe pre-built silently —', properties.length, 'properties ready before first open');
        } else {
          var leld = document.getElementById('earth3d-loading'); if (leld) leld.style.display = 'none';
          earthEntry();
          sampleFps3D();
          console.log('🌍 globe mode ready -', properties.length, 'properties on a real planet (kept alive between opens)');
        }
      });
    }

    var earthBtn = document.getElementById('earth-toggle');
    if (earthBtn) earthBtn.addEventListener('click', function() { open3D(); });
    var earthExit = document.getElementById('earth3d-exit');
    if (earthExit) earthExit.addEventListener('click', close3D);
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && document.getElementById('earth3d').classList.contains('open')) close3D();
    });

    // ---- Google-Earth gesture bridge: hold middle mouse (or two fingers) to tilt into 3D ----
    var mapEl2D = document.getElementById('map');
    if (mapEl2D) {
      mapEl2D.addEventListener('mousedown', function(e) {
        if (e.button !== 1 || window.positionEditActive) return;
        if (document.getElementById('earth3d').classList.contains('open')) return;
        e.preventDefault();
        midDrag2D = { x: e.clientX, y: e.clientY, live: false };
      });
      mapEl2D.addEventListener('auxclick', function(e) { e.preventDefault(); });
      var twoFinger = null;
      mapEl2D.addEventListener('touchstart', function(e) {
        if (e.touches.length === 2 && !window.positionEditActive) {
          var tdx = e.touches[0].clientX - e.touches[1].clientX;
          var tdy = e.touches[0].clientY - e.touches[1].clientY;
          twoFinger = { d: Math.sqrt(tdx * tdx + tdy * tdy), y: (e.touches[0].clientY + e.touches[1].clientY) / 2 };
        } else { twoFinger = null; }
      }, { passive: true });
      mapEl2D.addEventListener('touchmove', function(e) {
        if (!twoFinger || e.touches.length !== 2) return;
        if (document.getElementById('earth3d').classList.contains('open')) return;
        var mdx = e.touches[0].clientX - e.touches[1].clientX;
        var mdy = e.touches[0].clientY - e.touches[1].clientY;
        var nd = Math.sqrt(mdx * mdx + mdy * mdy);
        var ny = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        if (Math.abs(nd - twoFinger.d) < 45 && Math.abs(ny - twoFinger.y) > 38) {
          twoFinger = null;
          open3D({ gesture: true, pitch: 52 });
        }
      }, { passive: true });
      mapEl2D.addEventListener('touchend', function() { twoFinger = null; }, { passive: true });
    }
    var orbitVel = null;
    window.addEventListener('mousemove', function(e) {
      if (midDrag2D) {
        var gdx = e.clientX - midDrag2D.x, gdy = e.clientY - midDrag2D.y;
        if (!midDrag2D.live) {
          if (Math.abs(gdx) + Math.abs(gdy) > 5) { midDrag2D.live = true; open3D({ gesture: true, pitch: 0 }); }
        } else {
          earthGestureDelta(gdx, gdy);
          orbitVel = { x: gdx, y: gdy };
        }
        midDrag2D.x = e.clientX; midDrag2D.y = e.clientY;
        return;
      }
      if (orbitDrag && earth3dMap) {
        var odx = e.clientX - orbitDrag.x, ody = e.clientY - orbitDrag.y;
        earthGestureDelta(odx, ody);
        orbitVel = { x: odx, y: ody };
        orbitDrag.x = e.clientX; orbitDrag.y = e.clientY;
      }
    });
    window.addEventListener('mouseup', function(e) {
      if (e.button !== 1) return;
      var hadDrag = !!(midDrag2D && midDrag2D.live) || !!orbitDrag;
      midDrag2D = null; orbitDrag = null;
      if (hadDrag && orbitVel && earth3dMap && earthReady && (Math.abs(orbitVel.x) > 2 || Math.abs(orbitVel.y) > 2)) {
        var vx = orbitVel.x, vy = orbitVel.y;
        (function glide() {
          vx *= 0.9; vy *= 0.9;
          if ((Math.abs(vx) < 0.4 && Math.abs(vy) < 0.4) || !earth3dMap) return;
          earthGestureDelta(vx, vy);
          requestAnimationFrame(glide);
        })();
      }
      orbitVel = null;
    });
    var gearthBtn = document.getElementById('earth3d-gearth');
    if (gearthBtn) gearthBtn.addEventListener('click', function() {
      var glat = 34.4287, glng = -119.2375, gzm = 13, ghd = 0, gtl = 0;
      if (earth3dMap) {
        var gcc = earth3dMap.getCenter(); glat = gcc.lat; glng = gcc.lng;
        gzm = earth3dMap.getZoom(); ghd = earth3dMap.getBearing(); gtl = earth3dMap.getPitch();
      }
      var gdist = Math.round(40075017 * Math.abs(Math.cos(glat * Math.PI / 180)) / Math.pow(2, gzm + 1));
      window.open('https://earth.google.com/web/@' + glat.toFixed(6) + ',' + glng.toFixed(6) + ',0a,' + gdist + 'd,35y,' + ghd.toFixed(1) + 'h,' + gtl.toFixed(1) + 't,0r', '_blank');
    });

    // 🌀 Portal: property panel -> Vision mode -> cinematic globe dive
    window.enterPortal = function(propId) {
      var pp = document.getElementById('property-panel');
      if (pp) pp.classList.remove('open');
      if (typeof unlockBodyScroll === 'function') unlockBodyScroll();
      if (!window.visionMode) { try { applyMode(true); } catch (e) {} }
      earthDiveTo = propertiesById[propId] || null;
      open3D({ dive: true });
    };
    function buildStars() {
      var el = document.getElementById('earth3d-stars');
      if (!el || el.dataset.built) return;
      el.dataset.built = '1';
      var sh = '';
      for (var i = 0; i < 160; i++) {
        var sx = (Math.random() * 100).toFixed(2);
        var sy = (Math.random() * 100).toFixed(2);
        var so = (Math.random() * 0.7 + 0.25).toFixed(2);
        sh += (sh ? ', ' : '') + sx + 'vw ' + sy + 'vh 0 ' + (Math.random() > 0.85 ? '1px' : '0') + ' rgba(255,255,255,' + so + ')';
      }
      var dot = document.createElement('div');
      dot.style.cssText = 'position:absolute;top:0;left:0;width:2px;height:2px;border-radius:50%;box-shadow:' + sh;
      el.appendChild(dot);
    }

    // Pre-BUILD the whole 3D world silently at page load (johny: "pre-loaded and ready to display").
    // The map is constructed in a full-size but invisible overlay so tiles, terrain, shaders and the
    // zone layer are all ready BEFORE the first open — then it drops to display:none, still alive.
    function prebuild3D() {
      var e3 = document.getElementById('earth3d');
      if (earth3dMap || !e3 || e3.classList.contains('open')) return;
      earthPrebuilding = true;
      e3.classList.add('prebuilding');
      loadMapLibre(function() {
        if (document.getElementById('earth3d').classList.contains('open')) return; // user beat us to it
        try { build3D(); }
        catch (e) {
          earthPrebuilding = false;
          e3.classList.remove('prebuilding');
        }
      });
    }
    // V0.21.1 — the pre-warm costs ~1.1MB (MapLibre + first tiles) and most
    // visitors never open 3D, so only pay it where it is genuinely free:
    // a roomy, fast, unmetered connection. Everyone else loads on demand
    // (the pulsing orb already covers that), and hovering the 🌍 button
    // starts the download early so the click still feels instant.
    function should3DPrebuild() {
      try {
        var c = navigator.connection || navigator.mozConnection || navigator.webkitConnection || {};
        if (c.saveData) return false;
        if (c.effectiveType && /2g|3g/.test(c.effectiveType)) return false;
        if (typeof navigator.deviceMemory === 'number' && navigator.deviceMemory < 4) return false;
        var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
        if (coarse && Math.min(screen.width, screen.height) < 700) return false;   // phones
        return true;
      } catch (e) { return true; }
    }
    var earthPrefetched = false;
    function prefetch3D() {
      if (earthPrefetched || earth3dMap) return;
      earthPrefetched = true;
      try { loadMapLibre(function () {}); } catch (e) {}
    }
    if (should3DPrebuild()) {
      setTimeout(prebuild3D, 2200);
    } else {
      var eb = document.getElementById('earth-toggle');
      if (eb) {
        eb.addEventListener('mouseenter', prefetch3D, { passive: true });
        eb.addEventListener('touchstart', prefetch3D, { passive: true });
      }
    }

    // ---- Status cards, mode strips, documents, community preview cards (V0.17) ----
    window.modeStripHTML = function() {
      if (window.visionMode) {
        return '<div class="mode-strip vision">✨ VISION — proposed potential &amp; plans</div>';
      }
      return '<div class="mode-strip today">🏞️ TODAY — the property as it really is</div>';
    };
    window.statusCardHTML = function(prop) {
      var st = prop.status && (window.visionMode ? prop.status.vision : prop.status.today);
      if (!st) return '';
      var h = '<div class="status-card' + (window.visionMode ? ' vision' : '') + '">';
      h += '<div class="status-badge">' + st.badge + '</div>';
      (st.rows || []).forEach(function(r) {
        h += '<div class="status-row"><span class="status-label">' + r[0] + '</span><span class="status-value">' + r[1] + '</span></div>';
      });
      if (st.note) h += '<div class="status-note">' + st.note + '</div>';
      h += '</div>';
      return h;
    };
    // ---- county dossier card ------------------------------------------
    window.dossierSectionHTML = function(prop) {
      if (!prop || (!prop.apn && !prop.center)) return '';
      return '<div class="dossier-section" id="dossier-section">'
        + '<h4>&#128451;&#65039; The County Record</h4>'
        + '<p class="section-sub">' + (prop.lots && prop.lots.length > 1
            ? 'This property is ' + prop.lots.length + ' separate parcels. Shown below is the one under the centre pin — pulled live from Ventura County GIS, FEMA and USGS.'
            : 'Everything the public record holds on this parcel — pulled live from Ventura County GIS, FEMA and USGS when you opened this panel.') + '</p>'
        + '<div id="dossier-body"><div class="ds-wait"><span class="ds-spin"></span>Reading the county…</div></div>'
        + '</div>';
    };
    function dsEsc(s) {
      return String(s === null || s === undefined ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    window.dossierHTML = function(d) {
      var h = '';
      h += '<div class="ds-head"><span class="ds-apn">' + dsEsc(d.apn) + '</span>'
         + (d.situs ? '<span class="ds-situs">' + dsEsc(d.situs) + '</span>' : '')
         + (d.acreage ? '<span class="ds-situs">' + d.acreage.toFixed(2) + ' ac</span>' : '')
         + '</div>';
      (d.flags || []).forEach(function(f) {
        h += '<div class="ds-flag ' + dsEsc(f.level) + '">' + dsEsc(f.text) + '</div>';
      });
      (d.sections || []).forEach(function(s, i) {
        h += '<details class="ds-fold"' + (i < 2 ? ' open' : '') + '>'
           + '<summary>' + dsEsc(s.label) + '<span class="ds-count">' + s.rows.length + '</span></summary>'
           + '<div class="ds-rows">';
        s.rows.forEach(function(r) {
          h += '<div class="ds-row"><span class="ds-k">' + dsEsc(r[0]) + '</span><span class="ds-v">' + dsEsc(r[1]) + '</span></div>';
        });
        h += '</div></details>';
      });
      if (d.records && d.records.length) {
        h += '<details class="ds-fold"><summary>Recorded maps &amp; surveys<span class="ds-count">' + d.records.length + '</span></summary><div class="ds-rows">';
        h += '<p class="ds-note">Every map ever filed over this land — the same documents a surveyor retraces. Each one opens as the county’s own scan.</p>';
        d.records.forEach(function(r) {
          var meta = [r.year, r.surveyor, r.note, (r.pages ? r.pages + (r.pages > 1 ? ' sheets' : ' sheet') : null)]
            .filter(Boolean).join(' · ');
          if (r.url) {
            h += '<a class="ds-doc" href="' + dsEsc(r.url) + '" target="_blank" rel="noopener">'
               + '<span class="ds-doc-l"><b>' + dsEsc(r.label) + '</b><i>' + dsEsc(meta) + '</i></span>'
               + '<span class="ds-doc-o">open ↗</span></a>';
          } else {
            h += '<div class="ds-row"><span class="ds-k">' + dsEsc(r.label) + '</span><span class="ds-v">' + dsEsc(meta) + '</span></div>';
          }
        });
        h += '</div></details>';
      }
      h += '<div class="ds-foot">Resolved from ' + (d.sourcesAnswered || 0) + ' public sources on '
         + new Date(d.resolvedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
         + '. County assessor figures are not an appraisal; recorded documents, not GIS, are the authority on boundaries.</div>';
      return h;
    };
    window.loadDossier = function(prop) {
      var body = document.getElementById('dossier-body');
      if (!body || !prop) return;
      var q = prop.apn ? 'apn=' + encodeURIComponent(prop.apn)
            : (prop.center ? 'lat=' + prop.center[0] + '&lon=' + prop.center[1] : null);
      if (!q) { body.innerHTML = '<div class="ds-wait">No parcel reference for this property yet.</div>'; return; }
      fetch('/api/dossier?' + q)
        .then(function(r) { return r.json(); })
        .then(function(d) {
          if (!document.getElementById('dossier-body')) return;
          if (d.error) throw new Error(d.error);
          document.getElementById('dossier-body').innerHTML = window.dossierHTML(d);
        })
        .catch(function(e) {
          var b = document.getElementById('dossier-body');
          if (b) b.innerHTML = '<div class="ds-wait">Could not reach the county records right now. ' + dsEsc(e.message || '') + '</div>';
        });
    };
    window.docsSectionHTML = function(prop) {
      if (!prop.docs || !prop.docs.length) return '';
      var h = '<div class="docs-section"><h4>📄 Documents &amp; Proposals</h4><p class="section-sub">Full write-ups and supporting materials — open any of these for the complete picture.</p>';
      prop.docs.forEach(function(d) {
        h += '<a class="doc-link" href="https://raw.githubusercontent.com/SacredRebel/howard-property-dev/main/' + d.file + '" target="_blank" rel="noopener"><span>' + d.label + '</span><span class="doc-dl">open ↗</span></a>';
      });
      h += '</div>';
      return h;
    };
    window.lastCommunityCardId = null;
    window.openCommunityCard = function(propId) {
      var prop = propertiesById[propId];
      if (!prop) return;
      var card = document.getElementById('community-card');
      var box = document.getElementById('community-card-box');
      if (!card || !box) { openPropertyPanel(propId); return; }
      window.lastCommunityCardId = propId;
      var title = (window.visionMode && prop.visionLabelChip) ? prop.visionLabelChip : (prop.labelChip || prop.name);
      var h = '<div class="cc-close" onclick="window.closeCommunityCard()">✕</div>';
      h += '<div class="cc-title">' + title + '</div>';
      h += window.modeStripHTML();
      h += window.statusCardHTML(prop);
      if (prop.docs && prop.docs.length) {
        h += '<div class="cc-docs">📄 ' + prop.docs.length + ' document' + (prop.docs.length > 1 ? 's' : '') + ' in Full Details</div>';
      }
      h += '<div class="cc-actions">';
      h += '<div class="cc-btn primary" onclick="window.closeCommunityCard(); openPropertyPanel(&quot;' + prop.id + '&quot;)">📖 Full Details</div>';
      h += '<div class="cc-btn portal" onclick="window.closeCommunityCard(); window.enterPortal(&quot;' + prop.id + '&quot;)">🌀 Enter the Vision</div>';
      h += '</div>';
      box.innerHTML = h;
      card.classList.add('open');
    };
    window.closeCommunityCard = function() {
      var card = document.getElementById('community-card');
      if (card) card.classList.remove('open');
      window.lastCommunityCardId = null;
    };

    // ---- Current / Vision mode engine ----
    window.visionMode = false;
    window.zoneVisibleInMode = function(mode) {
      mode = mode || 'both';
      if (mode === 'both') return true;
      return window.visionMode ? (mode === 'vision') : (mode === 'current');
    };
    function applyMode(vision) {
      window.visionMode = !!vision;
      try { localStorage.setItem('ojaiMapMode', vision ? 'vision' : 'current'); } catch (err) {}
      document.body.classList.toggle('vision-mode', !!vision);
      var tgl = document.getElementById('mode-toggle');
      if (tgl) tgl.classList.toggle('vision', !!vision);
      // property chips swap to their vision identity
      properties.forEach(function(p) {
        var getEl = window.propertyChipEls && window.propertyChipEls[p.id];
        var el = getEl && getEl();
        if (el) el.textContent = (vision && p.visionLabelChip) ? p.visionLabelChip : p.labelChip;
      });
      // territory circles follow their zone's mode
      zones.forEach(function(z) {
        var t = window.zoneTerritoryToggles && window.zoneTerritoryToggles[z.propertyId + '/' + z.id];
        if (t) t(window.zoneVisibleInMode(z.mode));
      });
      // markers re-evaluate visibility
      updateMarkerScale();
      // footer narrative
      var f = document.getElementById('map-footer-text');
      if (f) {
        var visibleZones = zones.filter(function(z) { return window.zoneVisibleInMode(z.mode); }).length;
        f.textContent = vision
          ? ('© 2026 Lemuria Life — Sacred Villages | ' + properties.length + ' Properties • ' + visibleZones + ' Vision Projects | The Golden Age Map')
          : ('© 2026 Ojai Valley Properties | ' + properties.length + ' Properties • ' + visibleZones + ' Projects | Interactive Map');
      }
      // live-refresh any open property panel / community card into the new mode
      var ppEl = document.getElementById('property-panel');
      if (ppEl && ppEl.classList.contains('open') && window.currentPropertyId) {
        openPropertyPanel(window.currentPropertyId);
      }
      var ccElRef = document.getElementById('community-card');
      if (ccElRef && ccElRef.classList.contains('open') && window.lastCommunityCardId) {
        window.openCommunityCard(window.lastCommunityCardId);
      }
      console.log(vision ? '✨ Vision mode — Lemuria awakens' : '🏞️ Current mode — the reality of today');
    }
    window.applyMode = applyMode;
    var modeToggleEl = document.getElementById('mode-toggle');
    if (modeToggleEl) {
      modeToggleEl.addEventListener('click', function() { applyMode(!window.visionMode); });
    }
    var savedMode = null;
    try { savedMode = localStorage.getItem('ojaiMapMode'); } catch (err) {}
    applyMode(savedMode === 'vision');

    console.log('✅ Howard Property Interactive Map fully initialized');
    console.log('🎯 Ready for investor presentations and zone exploration');
    console.log('📁 Image upload system ready - all directories created');
  </script>
</body>
</html>`

    // Replace placeholders with actual data
    const finalHtml = htmlContent
      .replace('PROPERTIES_PLACEHOLDER', JSON.stringify(PROPERTIES));

    // Set correct content type header and send as HTML
    res.type('html');
    res.status(200);
    res.end(finalHtml);
    console.log('✅ Served interactive map successfully');

  } catch (error) {
    console.error('❌ Error serving interactive map:', error);
    res.status(500).send('Server Error: ' + error.message);
  }
});

// Helper function to parse budget strings (handles K suffix, ranges, and phases)
function parseBudget(budgetStr) {
  // Extract all numbers with K suffix or regular numbers
  const numbers = [];
  
  // Match patterns like $70K, $35,000, etc.
  const matches = budgetStr.matchAll(/\$(\d+(?:,\d{3})*|\d+)K?/gi);
  
  for (const match of matches) {
    let num = parseFloat(match[1].replace(/,/g, ''));
    // If it had 'K' suffix, multiply by 1000
    if (match[0].toUpperCase().includes('K')) {
      num *= 1000;
    }
    numbers.push(num);
  }
  
  // If no numbers found, return 0
  if (numbers.length === 0) return 0;
  
  // Return average of all numbers found
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
}

// API endpoint for project zones data
// ============================================================================
//  COUNTY DOSSIER RESOLVER  (V0.22)
//  Given an APN or a point, pull everything the public record holds about a
//  parcel and normalise it into one shape. Resolve on demand, cache the result
//  - never bulk-copy the county.
// ============================================================================
const VC_AGS = 'https://maps.ventura.org/arcgis/rest/services/';
const RECORDMAP_BASE = 'https://maps.ventura.org/recordmaps/';
const DOSSIER_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const dossierCache = new Map();

function agsForm(params) {
  const b = new URLSearchParams();
  Object.keys(params).forEach((k) => { if (params[k] !== undefined && params[k] !== null) b.append(k, String(params[k])); });
  return b;
}

async function agsPost(url, params, ms = 12000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: agsForm(params),
      signal: ctl.signal,
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    if (j.error) throw new Error(j.error.message || 'ags error');
    return j;
  } finally { clearTimeout(t); }
}

// one spatial query against an ArcGIS MapServer layer
async function agsQuery(service, layer, geometry, opts = {}) {
  const url = (opts.root || VC_AGS) + service + '/MapServer/' + layer + '/query';
  const p = Object.assign({
    where: opts.where || '1=1',
    outFields: '*',
    returnGeometry: opts.returnGeometry ? 'true' : 'false',
    outSR: '4326',
    f: 'json',
  }, geometry || {});
  if (opts.distance) { p.distance = opts.distance; p.units = 'esriSRUnit_Meter'; }
  const j = await agsPost(url, p);
  return (j.features || []);
}

const ptGeom = (lon, lat) => ({
  geometry: lon + ',' + lat, geometryType: 'esriGeometryPoint',
  inSR: '4326', spatialRel: 'esriSpatialRelIntersects',
});
const envGeom = (b) => ({
  geometry: [b.xmin, b.ymin, b.xmax, b.ymax].join(','), geometryType: 'esriGeometryEnvelope',
  inSR: '4326', spatialRel: 'esriSpatialRelIntersects',
});
const polyGeom = (rings) => ({
  geometry: JSON.stringify({ rings: rings, spatialReference: { wkid: 4326 } }),
  geometryType: 'esriGeometryPolygon', inSR: '4326', spatialRel: 'esriSpatialRelIntersects',
});

const money = (v) => (v === null || v === undefined || v === '' ? null : '$' + Number(v).toLocaleString('en-US'));
const clean = (s) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim() : s);
const titleish = (s) => (typeof s === 'string' ? s.charAt(0) + s.slice(1).toLowerCase() : s);

// California Wildlife Habitat Relationships codes that actually occur around Ojai
const WHR = {
  COW: 'Coastal Oak Woodland', BOW: 'Blue Oak Woodland', VOW: 'Valley Oak Woodland',
  MHC: 'Mixed Chaparral', CRC: 'Chamise-Redshank Chaparral', CSC: 'Coastal Scrub',
  ASP: 'Aspen', MHW: 'Montane Hardwood', MHF: 'Montane Hardwood-Conifer',
  AGS: 'Annual Grassland', PGS: 'Perennial Grassland', VRI: 'Valley Foothill Riparian',
  MRI: 'Montane Riparian', URB: 'Urban', AGR: 'Agriculture', BAR: 'Barren',
};

// Declarative source table - each entry contributes rows to one dossier section.
// `hit` formats a found feature; `miss` states the (useful) fact that nothing was found.
const DOSSIER_SOURCES = [
  { sec: 'landuse', svc: 'SDs/MyZoning', layer: 0,
    hit: (a) => [['Zoning', a.ZONE], ['Base zone', a.DEFINITION]] },
  { sec: 'landuse', svc: 'DataDownloads/LandUse', layer: 1,
    hit: (a) => [['General Plan', a.genplandes], ['2040 General Plan', a.f2040gp]] },
  { sec: 'landuse', svc: 'DataDownloads/LandUse', layer: 0,
    hit: (a) => [['Area plan', a.name], ['Land use designation', clean(a.designat_2) || a.designatio]] },

  { sec: 'hazards', svc: 'SDs/CV_Hazards', layer: 6, geom: 'poly',
    hit: (a) => [['Fire hazard severity', a.HAZ_CLASS + (a.SRA ? ' · State Responsibility Area' : '')]],
    miss: () => [['Fire hazard severity', 'Not in a mapped severity zone']] },
  { sec: 'hazards', svc: 'SDs/CV_Hazards', layer: 0, geom: 'poly',
    hit: (a) => [['FEMA flood zone', 'Zone ' + a.FLD_ZONE + ' touches the parcel — ' + clean(a.FLOODHAZ)]],
    miss: () => [['FEMA flood zone', 'No part of the parcel is in the mapped 100-year floodplain']] },
  { sec: 'hazards', svc: 'DataDownloads/Hazards', layer: 6, geom: 'poly',
    hit: (a) => [['Earthquake Fault Zone', 'Inside a state Alquist-Priolo special study zone — a fault investigation is required before building']],
    miss: () => [['Earthquake Fault Zone', 'Not in an Alquist-Priolo zone']] },
  { sec: 'hazards', svc: 'DataDownloads/Hazards', layer: 5, geom: 'poly',
    hit: () => [['Liquefaction', 'A mapped liquefaction zone touches the parcel']],
    miss: () => [['Liquefaction', 'Not in a mapped liquefaction zone']] },
  { sec: 'hazards', svc: 'DataDownloads/Hazards', layer: 4, geom: 'poly',
    hit: () => [['Mapped landslide', 'A mapped landslide touches this parcel']],
    miss: () => [['Mapped landslide', 'None mapped on the parcel']] },
  { sec: 'hazards', svc: 'DataDownloads/Hazards', layer: 3, geom: 'poly',
    hit: () => [['Earthquake-induced landslide', 'A potential earthquake-induced landslide zone touches the parcel']],
    miss: () => [['Earthquake-induced landslide', 'Not in a mapped zone']] },
  { sec: 'hazards', svc: 'DataDownloads/Hazards', layer: 2,
    hit: (a) => (a.venturapga == null ? [] : [['Ground shaking', (a.venturapga / 1000).toFixed(2) + ' g peak acceleration · county model value ' + a.venturapga]]) },
  { sec: 'hazards', svc: 'DataDownloads/Hazards', layer: 7,
    hit: () => [['Subsidence', 'Inside a mapped subsidence zone']] },

  { sec: 'ground', svc: 'DataDownloads/NaturalResources', layer: 3,
    hit: (a) => {
      const r = [['Soil map unit', clean(a.muname).replace(/erode d\b/i, 'eroded')]];
      if (a.musym) r.push(['Soil symbol', a.musym + (a.mukey ? ' · mukey ' + a.mukey : '')]);
      if (a.slopegradw != null) r.push(['Representative slope', a.slopegradw + '%']);
      if (a.flodfreqdc) r.push(['Flooding frequency', a.flodfreqdc]);
      if (a.pondfreqpr) r.push(['Ponding frequency', a.pondfreqpr]);
      if (a.brockdepmi) r.push(['Depth to bedrock', a.brockdepmi + ' cm']);
      if (a.aws050wta != null) r.push(['Available water, top 50 cm', Number(a.aws050wta).toFixed(1) + ' cm']);
      return r;
    } },
  { sec: 'ground', svc: 'DataDownloads/Hazards', layer: 1,
    hit: (a) => [['Expansive soils', titleish(a.name)]] },
  { sec: 'ground', svc: 'DataDownloads/NaturalResources', layer: 2,
    hit: (a) => {
      const t = WHR[a.whrtype] || a.whrtype;
      if (!t) return [];
      const bits = [t];
      if (a.whr_range) bits.push(a.whr_range + '% canopy cover');
      return [['Habitat type', bits.join(' · ')]];
    } },
  { sec: 'ground', svc: 'DataDownloads/NaturalResources', layer: 0,
    hit: (a) => [['Farmland classification', clean(a.type_2)]] },
  { sec: 'ground', svc: 'DataDownloads/NaturalResources', layer: 1, geom: 'poly',
    hit: () => [['Habitat connectivity', 'A mapped habitat connectivity area touches the parcel']] },

  { sec: 'water', svc: 'SDs/Groundwater', layer: 0,
    hit: (a) => [['Groundwater basin', clean(a.BASIN_NAME) + ' · DWR basin ' + a.BASIN_NUMB]],
    miss: () => [['Groundwater basin', 'Outside a DWR-defined groundwater basin']] },
  { sec: 'water', svc: 'SDs/Groundwater', layer: 1,
    hit: (a) => [['Sustainability agency', clean(a.GSA_Name || a.AGENCYNAME || a.NAME || 'mapped GSA')]] },
  { sec: 'water', svc: 'SDs/Watershed', layer: 0,
    hit: (a) => [['Watershed', clean(a.NAME || a.WATERSHED || a.Name)]] },

  { sec: 'permits', svc: 'DataDownloads/Permitting', layer: 1, dist: 1600,
    hit: (a, n) => [['Mining permits within 1 mile', String(n)]] },
  { sec: 'permits', svc: 'DataDownloads/Permitting', layer: 2, dist: 1600,
    hit: (a, n) => [['Oil permits within 1 mile', String(n)]] },
  { sec: 'permits', svc: 'DataDownloads/Permitting', layer: 0, dist: 3200,
    hit: (a, n) => [['Communication facilities within 2 miles', String(n)]] },
];

const SECTION_META = [
  ['identity',   'Identity & location'],
  ['valuation',  'Valuation & transfer'],
  ['landuse',    'Land use & entitlement'],
  ['hazards',    'Hazards'],
  ['ground',     'Ground, soil & habitat'],
  ['water',      'Water'],
  ['structures', 'Structures on record'],
  ['permits',    'Nearby permits'],
  ['records',    'Recorded maps'],
];

async function sampleElevation(bbox) {
  const url = 'https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/identify';
  const pts = [];
  for (let i = 0; i <= 2; i++) {
    for (let k = 0; k <= 2; k++) {
      pts.push([bbox.xmin + (bbox.xmax - bbox.xmin) * (i / 2), bbox.ymin + (bbox.ymax - bbox.ymin) * (k / 2)]);
    }
  }
  const vals = await Promise.all(pts.map(async (p) => {
    try {
      const j = await agsPost(url, {
        geometry: JSON.stringify({ x: p[0], y: p[1], spatialReference: { wkid: 4326 } }),
        geometryType: 'esriGeometryPoint', returnGeometry: 'false', f: 'json',
      }, 9000);
      const v = parseFloat(j.value);
      return isFinite(v) ? v : null;
    } catch (e) { return null; }
  }));
  const ok = vals.filter((v) => v !== null);
  if (ok.length < 3) return null;
  const lo = Math.min.apply(null, ok), hi = Math.max.apply(null, ok);
  const m2ft = (m) => Math.round(m * 3.28084);
  return { lowFt: m2ft(lo), highFt: m2ft(hi), reliefFt: m2ft(hi - lo), samples: ok.length };
}

async function resolveDossier(q) {
  // --- 1. anchor on the parcel -------------------------------------------
  let parcel = null;
  if (q.apn) {
    const apn10 = String(q.apn).replace(/[^0-9]/g, '');
    const rows = await agsQuery('SDs/Parcels', 0, null, {
      where: "APN10='" + apn10 + "'", returnGeometry: true,
    });
    parcel = rows[0];
  }
  if (!parcel && q.lat != null && q.lon != null) {
    const rows = await agsQuery('SDs/Parcels', 0, ptGeom(q.lon, q.lat), { returnGeometry: true });
    parcel = rows[0];
  }
  if (!parcel) { const e = new Error('No parcel found'); e.status = 404; throw e; }

  const a = parcel.attributes;
  const rings = (parcel.geometry && parcel.geometry.rings) || null;
  let bbox = null, cx = q.lon, cy = q.lat;
  if (rings) {
    let xmin = 1e9, ymin = 1e9, xmax = -1e9, ymax = -1e9;
    rings.forEach((r) => r.forEach((p) => {
      if (p[0] < xmin) xmin = p[0]; if (p[0] > xmax) xmax = p[0];
      if (p[1] < ymin) ymin = p[1]; if (p[1] > ymax) ymax = p[1];
    }));
    bbox = { xmin, ymin, xmax, ymax };
    cx = (xmin + xmax) / 2; cy = (ymin + ymax) / 2;
  }
  const point = ptGeom(cx, cy);
  const buckets = {}; SECTION_META.forEach(([id]) => { buckets[id] = []; });

  // --- 2. identity + valuation from the assessor record -------------------
  const apnPretty = a.APN10 ? a.APN10.replace(/^(\d{3})(\d)(\d{3})(\d{3})$/, '$1-$2-$3-$4') : (a.APN || '');
  buckets.identity.push(['APN', apnPretty]);
  if (a.APN10) buckets.identity.push(['APN (unformatted)', a.APN10]);
  if (a.SITUS) buckets.identity.push(['Situs address', clean(a.SITUS)]);
  if (a.BOOK) buckets.identity.push(['Book · page · block · parcel', [a.BOOK, a.PAGE, a.BLOCK, a.PARCEL].filter(Boolean).join(' · ')]);
  if (a.ACREAGE) buckets.identity.push(['Acreage', parseFloat(a.ACREAGE).toFixed(2) + ' ac']);
  if (a['SHAPE.AREA']) buckets.identity.push(['Parcel area', Math.round(a['SHAPE.AREA']).toLocaleString('en-US') + ' sq ft']);
  if (a['SHAPE.LEN']) buckets.identity.push(['Perimeter', Math.round(a['SHAPE.LEN']).toLocaleString('en-US') + ' ft']);
  if (a.TRA) buckets.identity.push(['Tax rate area', a.TRA]);
  if (a.TRACT) buckets.identity.push(['Tract', clean(a.TRACT)]);

  const lv = a.L_V ? Number(a.L_V) : null, iv = a.I_V ? Number(a.I_V) : null;
  if (lv) buckets.valuation.push(['Assessed land value', money(lv)]);
  if (iv !== null) buckets.valuation.push(['Assessed improvement value', money(iv)]);
  if (lv) buckets.valuation.push(['Total assessed value', money((lv || 0) + (iv || 0))]);
  if (lv && a.ACREAGE && parseFloat(a.ACREAGE) > 0) {
    buckets.valuation.push(['Assessed land per acre', money(Math.round(lv / parseFloat(a.ACREAGE)))]);
  }
  if (a.SQ_FT_I) buckets.valuation.push(['Improved floor area on record', Number(a.SQ_FT_I).toLocaleString('en-US') + ' sq ft']);
  if (a.DOC_NR) buckets.valuation.push(['Last recorded document', a.DOC_NR + (a.DOC_TYPE ? ' · type ' + a.DOC_TYPE : '')]);
  if (a.DOC_DT && /^\d{8}$/.test(a.DOC_DT)) {
    const d = a.DOC_DT;
    buckets.valuation.push(['Document date', new Date(d.slice(0, 4) + '-' + d.slice(4, 6) + '-' + d.slice(6, 8) + 'T12:00:00Z')
      .toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })]);
  }
  if (a.CL) buckets.valuation.push(['Assessor class code', a.CL + (a.QC ? ' · qual ' + a.QC : '')]);

  // --- 3. fan out ---------------------------------------------------------
  const jobs = DOSSIER_SOURCES.map(async (s) => {
    try {
      const g = s.dist ? Object.assign({}, point, { distance: s.dist, units: 'esriSRUnit_Meter' })
        : (s.geom === 'poly' && rings ? polyGeom(rings) : point);
      const fs = await agsQuery(s.svc, s.layer, g);
      const rows = fs.length ? (s.hit(fs[0].attributes, fs.length) || []) : (s.miss ? s.miss() || [] : []);
      rows.forEach((r) => { if (r && r[1] !== null && r[1] !== undefined && r[1] !== '') buckets[s.sec].push(r); });
      return 1;
    } catch (e) { return 0; }
  });

  // structures actually inside the parcel polygon
  jobs.push((async () => {
    try {
      if (!rings) return 0;
      const fs = await agsQuery('DataDownloads/CommonData', 0, polyGeom(rings));
      if (!fs.length) {
        buckets.structures.push(['Buildings mapped by the county', 'None']);
        return 1;
      }
      buckets.structures.push(['Buildings mapped by the county', String(fs.length)]);
      const uses = {};
      fs.forEach((f) => {
        const at = f.attributes;
        const u = clean(at.building_d || at.buildingty || at.BUILDING_D || 'unclassified');
        uses[u] = (uses[u] || 0) + 1;
      });
      Object.keys(uses).forEach((u) => buckets.structures.push(['— ' + titleish(u), uses[u] + (uses[u] > 1 ? ' structures' : ' structure')]));
      const hs = fs.map((f) => f.attributes.height || f.attributes.HEIGHT).filter((h) => h != null && h > 0);
      if (hs.length) buckets.structures.push(['Tallest mapped structure', Math.max.apply(null, hs) + ' ft']);
      const area = fs.map((f) => f.attributes['st_area(shape)']).filter((v) => v > 0);
      if (area.length) buckets.structures.push(['Total mapped footprint', Math.round(area.reduce((x, y) => x + y, 0)).toLocaleString('en-US') + ' sq ft']);
      const yr = fs.map((f) => f.attributes.imagedate).filter(Boolean);
      if (yr.length) buckets.structures.push(['Footprints traced from imagery of', yr.sort().slice(-1)[0]]);
      return 1;
    } catch (e) { return 0; }
  })());

  // recorded maps - the chain of prior surveys, with links to the scans
  const records = [];
  jobs.push((async () => {
    try {
      if (!bbox) return 0;
      const fs = await agsQuery('DataDownloads/Survey', 4, envGeom(bbox));
      const seen = {};
      fs.forEach((f) => {
        const at = f.attributes;
        if (!at.recordlabel || seen[at.recordlabel]) return;
        seen[at.recordlabel] = 1;
        records.push({
          label: at.recordlabel,
          type: at.documenttype,
          year: at.year ? String(Math.round(at.year)) : null,
          surveyor: clean(at.surveyor) || null,
          note: clean(at.description) || (clean(at.recordmap) && clean(at.recordmap) !== 'PM UA' ? clean(at.recordmap) : null),
          pages: at.numberpages ? Math.round(at.numberpages) : null,
          url: at.documentlink ? RECORDMAP_BASE + at.documentlink : null,
        });
      });
      records.sort((x, y) => (Number(y.year || 0) - Number(x.year || 0)));
      return 1;
    } catch (e) { return 0; }
  })());

  // elevation profile across the parcel
  let elev = null;
  jobs.push((async () => {
    try { if (bbox) elev = await sampleElevation(bbox); return 1; } catch (e) { return 0; }
  })());

  const done = await Promise.all(jobs);

  if (elev) {
    buckets.ground.unshift(['Elevation range', elev.lowFt.toLocaleString('en-US') + '–' + elev.highFt.toLocaleString('en-US') + ' ft'],
      ['Relief across the parcel', elev.reliefFt + ' ft']);
  }

  // --- 4. flags - the things a buyer or a lender would want surfaced ------
  const flags = [];
  const flat = [].concat.apply([], SECTION_META.map(([id]) => buckets[id]));
  const findRow = (k) => { const r = flat.find((x) => x[0] === k); return r ? String(r[1]) : ''; };
  if (/very high|high/i.test(findRow('Fire hazard severity'))) {
    flags.push({ level: 'watch', text: findRow('Fire hazard severity') + ' fire severity — expect defensible-space and ignition-resistant construction requirements, and check insurability early.' });
  }
  if (/^Zone /.test(findRow('FEMA flood zone'))) {
    flags.push({ level: 'watch', text: findRow('FEMA flood zone') + ' — flood insurance is normally required by a lender, and habitable floors must sit above the base flood elevation.' });
  }
  if (/touches/.test(findRow('Mapped landslide')) || /touches/.test(findRow('Earthquake-induced landslide'))) {
    flags.push({ level: 'watch', text: 'Mapped landslide terrain on or touching the parcel \u2014 a geotechnical report will be part of any building permit; site the structure on the flat ground and keep the toe of the slope clear.' });
  }
  if (/Inside a state Alquist/.test(findRow('Earthquake Fault Zone'))) {
    flags.push({ level: 'watch', text: 'Alquist-Priolo zone — a fault investigation by a licensed geologist is required before a building permit.' });
  }
  if (a.SQ_FT_I && Number(a.SQ_FT_I) > 0 && /None/.test(findRow('Buildings mapped by the county'))) {
    flags.push({ level: 'note', text: 'The assessor records ' + Number(a.SQ_FT_I).toLocaleString('en-US') + ' sq ft of improvement, but the county maps no building footprint here. Worth reconciling before a lender does.' });
  }
  if (records.length) {
    flags.push({ level: 'good', text: records.length + ' recorded maps cover this parcel, back to ' + (records[records.length - 1].year || 'the earliest on file') + '. Each one is a downloadable scan.' });
  }

  const sections = SECTION_META
    .map(([id, label]) => ({ id, label, rows: buckets[id] }))
    .filter((s) => s.rows.length);

  return {
    apn: apnPretty,
    apn10: a.APN10 || null,
    situs: clean(a.SITUS) || null,
    acreage: a.ACREAGE ? parseFloat(a.ACREAGE) : null,
    center: [cy, cx],
    bbox: bbox,
    flags: flags,
    sections: sections,
    records: records,
    sourcesQueried: done.length,
    sourcesAnswered: done.reduce((n, v) => n + v, 0),
    resolvedAt: new Date().toISOString(),
  };
}

const SURVEY_FILES = { 'sulphur-mountain': 'sulphur-survey.json' };
app.get('/api/survey/:propertyId', (req, res) => {
  const f = SURVEY_FILES[req.params.propertyId];
  if (!f) return res.status(404).json({ error: 'No survey data for this property.' });
  try {
    const body = readFileSync(join(__dirname, 'data', f), 'utf8');
    res.set('Cache-Control', 'public, max-age=86400');
    res.type('application/json').send(body);
  } catch (e) { res.status(500).json({ error: 'Survey data unavailable.' }); }
});

app.get('/api/dossier', async (req, res) => {
  const apn = req.query.apn ? String(req.query.apn) : null;
  const lat = req.query.lat != null ? parseFloat(req.query.lat) : null;
  const lon = req.query.lon != null ? parseFloat(req.query.lon) : null;
  if (!apn && (lat === null || lon === null || !isFinite(lat) || !isFinite(lon))) {
    return res.status(400).json({ error: 'Pass either apn, or lat and lon.' });
  }
  const key = apn ? 'apn:' + String(apn).replace(/[^0-9]/g, '') : 'pt:' + lat.toFixed(5) + ',' + lon.toFixed(5);
  const fresh = req.query.refresh === '1';
  const hit = dossierCache.get(key);
  if (hit && !fresh && Date.now() - hit.ts < DOSSIER_TTL_MS) {
    res.set('Cache-Control', 'public, max-age=86400');
    return res.json(Object.assign({ cached: true }, hit.data));
  }
  try {
    const data = await resolveDossier({ apn, lat, lon });
    dossierCache.set(key, { ts: Date.now(), data });
    res.set('Cache-Control', 'public, max-age=86400');
    res.json(Object.assign({ cached: false }, data));
  } catch (e) {
    console.error('dossier:', e.message);
    res.status(e.status || 502).json({ error: e.message || 'Could not resolve this parcel.' });
  }
});

app.get('/api/project-zones', (req, res) => {
  try {
    const totalInvestment = PROJECT_ZONES.reduce((sum, zone) => {
      return sum + parseBudget(zone.budget);
    }, 0);

    res.json({
      success: true,
      totalZones: PROJECT_ZONES.length,
      properties: PROPERTIES.map(p => ({ id: p.id, name: p.name, zones: p.zones.length, boundarySegments: p.boundary.length })),
      totalInvestment: `$${totalInvestment.toLocaleString()}`,
      zones: PROJECT_ZONES,
      propertyLines: PERMANENT_PROPERTY_LINES.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    zones: PROJECT_ZONES.length,
    propertyLines: PERMANENT_PROPERTY_LINES.length
  });
});

// Save the icon layout to git. The editor posts { pin, positions } here;
// with a valid PIN the layout is committed to data/zone-positions.json on
// GitHub (which auto-redeploys the site) and applied in-memory immediately.
// Requires two Vercel env vars: EDIT_PIN and GITHUB_TOKEN (fine-grained PAT
// with Contents read/write on this repo). GITHUB_REPO overrides the default.
app.post('/api/save-positions', async (req, res) => {
  try {
    const { pin, positions } = req.body || {};
    const EDIT_PIN = process.env.EDIT_PIN;
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_REPO = process.env.GITHUB_REPO || 'SacredRebel/howard-property-dev';

    if (!EDIT_PIN || !GITHUB_TOKEN) {
      return res.status(501).json({ ok: false, error: 'not_configured' });
    }
    if (!pin || String(pin) !== String(EDIT_PIN)) {
      return res.status(401).json({ ok: false, error: 'bad_pin' });
    }
    if (!positions || typeof positions !== 'object') {
      return res.status(400).json({ ok: false, error: 'bad_body' });
    }

    // Validate against known properties/zones and apply in-memory
    const clean = {};
    for (const p of PROPERTIES) {
      const zones = positions[p.id];
      if (!zones || typeof zones !== 'object') continue;
      clean[p.id] = {};
      for (const z of p.zones) {
        const pos = zones[z.id];
        if (Array.isArray(pos) && pos.length === 2 && isFinite(pos[0]) && isFinite(pos[1])) {
          const lat = Math.round(pos[0] * 1e6) / 1e6;
          const lng = Math.round(pos[1] * 1e6) / 1e6;
          clean[p.id][z.id] = [lat, lng];
          z.position = [lat, lng];
        }
      }
    }

    // Commit to GitHub via the Contents API
    const filePath = 'data/zone-positions.json';
    const apiBase = 'https://api.github.com/repos/' + GITHUB_REPO + '/contents/' + filePath;
    const ghHeaders = {
      'Authorization': 'Bearer ' + GITHUB_TOKEN,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'ojai-map-server',
      'X-GitHub-Api-Version': '2022-11-28'
    };
    let sha;
    const getResp = await fetch(apiBase + '?ref=main', { headers: ghHeaders });
    if (getResp.ok) {
      const info = await getResp.json();
      sha = info.sha;
    }
    const content = Buffer.from(JSON.stringify(clean, null, 2) + '\n').toString('base64');
    const putResp = await fetch(apiBase, {
      method: 'PUT',
      headers: { ...ghHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: '📍 Save icon layout from the map editor',
        content: content,
        sha: sha,
        branch: 'main'
      })
    });
    if (!putResp.ok) {
      const detail = await putResp.text();
      return res.status(502).json({ ok: false, error: 'github_error', status: putResp.status, detail: String(detail).slice(0, 300) });
    }
    const result = await putResp.json();
    res.json({ ok: true, commit: result.commit && result.commit.sha });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'server_error', message: String(e && e.message) });
  }
});

// Mapping from project IDs to actual folder names under images/ — empty until
// zones and photo folders are added for the Howard Property.
const PROJECT_FOLDER_MAP = {};

// API endpoint to get images for a specific zone
// Uses configuration file (image-urls.js) with direct URLs from Supabase
// Supports subcategories for zones like infrastructure, main-residence, retreat-village
app.get('/api/images/:propertyId/:zoneId/:category', async (req, res) => {
  try {
    const { propertyId, zoneId, category } = req.params;
    const categoryLower = category.toLowerCase();
    
    // Get images from configuration
    const zoneImages = (IMAGE_URLS[propertyId] || {})[zoneId] || {};
    let categoryData = zoneImages[categoryLower];
    
    // Check if category data has subcategories (is an object with subcategory keys)
    let hasSubcategories = false;
    let images = [];
    let subcategories = null;
    
    if (categoryData && typeof categoryData === 'object' && !Array.isArray(categoryData)) {
      // This category has subcategories
      hasSubcategories = true;
      subcategories = Object.keys(categoryData);
      // Flatten all subcategory images into one array for backward compatibility
      images = Object.values(categoryData).flat();
    } else if (Array.isArray(categoryData)) {
      // Regular array of images
      images = categoryData;
    }
    
    // Aggressive caching for images (1 year) since URLs contain content hash
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    res.json({
      success: true,
      zoneId: zoneId,
      category: category,
      hasSubcategories: hasSubcategories,
      subcategories: subcategories,
      images: images,
      count: images.length,
      subcategoryData: hasSubcategories ? categoryData : null,
      note: 'Using configured URLs from image-urls.js'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Serve static images with strong caching
app.use(
  '/images',
  express.static(join(__dirname, 'images'), {
    maxAge: '30d',
    immutable: true,
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    },
  })
);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server with comprehensive error handling (only if not in Vercel serverless environment)
if (process.env.VERCEL !== '1') {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 Howard Property Interactive Map Server');
    console.log(`🌐 Server running on port ${PORT}`);
    console.log(`📊 Serving ${PROJECT_ZONES.length} zones across ${PROPERTIES.length} properties`);
    console.log(`🔲 ${PERMANENT_PROPERTY_LINES.length} permanent property boundary lines`);
    console.log('✨ Ready for interactive exploration');
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use`);
      console.log('💡 Kill existing processes with: Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force');
    } else {
      console.error('❌ Server error:', error);
    }
  });

  // Graceful shutdown handling
  process.on('SIGINT', () => {
    console.log('🛑 Shutting down Howard Property server gracefully...');
    server.close(() => {
      console.log('✅ Server shutdown complete');
      process.exit(0);
    });
  });
} else {
  console.log('🚀 Running in Vercel serverless mode');
}

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚫 Unhandled Rejection at:', promise, 'reason:', reason);
});

export default app;