// QR Code utilities for Game 2: Individual QR Code Progression

import QRCode from 'qrcode'

/**
 * Generate a QR code with missing cells that need to be filled
 * @param {string} data - The data to encode
 * @param {number} missingCells - Number of cells to remove
 * @param {number} seed - Random seed for deterministic cell selection
 * @returns {Promise<Object>} QR code data with missing cell positions
 */
export async function generateIncompleteQR(data, missingCells = 10, seed = null) {
  // Use qrcode library to create QR code matrix
  // We'll create it at a fixed size and extract the module data
  const size = 25 // QR code version 2, size 25x25
  const qrMatrix = await generateQRMatrix(data, size)
  
  // Select cells to remove (deterministic if seed provided)
  const rng = seed !== null ? seededRandom(seed) : () => Math.random()
  const cellPositions = []
  const missingPositions = new Set()
  
  // Collect all dark cell positions
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (qrMatrix[y][x]) {
        cellPositions.push({ x, y })
      }
    }
  }
  
  // Randomly select cells to remove
  for (let i = 0; i < Math.min(missingCells, cellPositions.length); i++) {
    const index = Math.floor(rng() * cellPositions.length)
    const pos = cellPositions.splice(index, 1)[0]
    missingPositions.add(`${pos.x},${pos.y}`)
  }
  
  return {
    data,
    matrix: qrMatrix,
    size: size,
    missingPositions: Array.from(missingPositions),
    seed
  }
}

async function generateQRMatrix(data, size) {
  // Generate QR code and parse the matrix
  // We'll use a canvas to render and read back
  const canvas = document.createElement('canvas')
  canvas.width = size * 10
  canvas.height = size * 10
  
  await QRCode.toCanvas(canvas, data, {
    width: size * 10,
    margin: 0,
    errorCorrectionLevel: 'M'
  })
  
  const ctx = canvas.getContext('2d')
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const matrix = []
  const cellSize = 10
  
  for (let y = 0; y < size; y++) {
    matrix[y] = []
    for (let x = 0; x < size; x++) {
      const pixelX = x * cellSize + cellSize / 2
      const pixelY = y * cellSize + cellSize / 2
      const index = (pixelY * canvas.width + pixelX) * 4
      const r = imageData.data[index]
      // Dark if R < 128
      matrix[y][x] = r < 128
    }
  }
  
  return matrix
}

/**
 * Map answer to QR cell position
 * @param {string} questionId - Question identifier
 * @param {string} answer - Selected answer
 * @param {number} totalCells - Total number of cells in QR code
 * @returns {string} Cell position key (x,y)
 */
export function answerToCellPosition(questionId, answer, totalCells) {
  // Deterministic mapping: hash questionId + answer to get cell position
  const hash = simpleHash(questionId + answer)
  const x = hash % totalCells
  const y = (hash * 7) % totalCells
  return `${x},${y}`
}

/**
 * Check if QR code is complete and scannable
 * @param {Object} qrData - QR code data with modules
 * @param {Set<string>} filledCells - Set of filled cell positions
 * @returns {boolean} True if QR code should be scannable
 */
export function isQRComplete(qrData, filledCells) {
  // Check if all missing positions have been filled
  return qrData.missingPositions.every(pos => filledCells.has(pos))
}

/**
 * Render QR code to canvas with missing cells
 */
export async function renderIncompleteQR(qrData, canvas, cellSize = 10) {
  if (!qrData || !qrData.matrix) return
  
  const ctx = canvas.getContext('2d')
  const size = qrData.size * cellSize
  
  canvas.width = size
  canvas.height = size
  
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, size, size)
  
  ctx.fillStyle = '#000000'
  const missingSet = new Set(qrData.missingPositions)
  const filledSet = qrData.filledCells || new Set()
  
  for (let y = 0; y < qrData.size; y++) {
    for (let x = 0; x < qrData.size; x++) {
      const posKey = `${x},${y}`
      const isMissing = missingSet.has(posKey)
      const isFilled = filledSet.has(posKey)
      
      if (qrData.matrix[y] && qrData.matrix[y][x]) {
        if (!isMissing || isFilled) {
          // Draw filled cell
          ctx.fillStyle = '#000000'
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize)
        } else {
          // Draw empty cell (missing, not filled)
          ctx.fillStyle = '#e9ecef'
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize)
          ctx.strokeStyle = '#dee2e6'
          ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize)
        }
      }
    }
  }
}

function seededRandom(seed) {
  let value = seed
  return function() {
    value = (value * 9301 + 49297) % 233280
    return value / 233280
  }
}

function simpleHash(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}
