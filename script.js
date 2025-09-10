// ===== CONFIGURAÇÕES GERAIS =====
const WHEEL_CONFIG = {
    colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'],
    spinDuration: 5000, // duração do giro em ms (aumentei para suavizar)
    minSpins: 10, // voltas mínimas
    maxSpins: 28, // voltas máximas
    textColor: '#2c3e50',
    maxNameLength: 66
};

// Config extra para suavizar
const SPIN_CONFIG = {
    easing: t => 1 - Math.pow(1 - t, 3), // easeOutCubic
};

// Configurações de áudio
const AUDIO_CONFIG = {
    enabled: true,
    tickFrequency: 800,
    winFrequency: 600
};

// ===== ELEMENTOS DO DOM =====
const elements = {
    canvas: document.getElementById('wheelCanvas'),
    spinButton: document.getElementById('spinButton'),
    nameTextArea: document.getElementById('nameTextArea'),
    winnerDisplay: document.getElementById('winnerDisplay'),
    winnerPrefix: document.getElementById('winnerPrefix'),
    winnerName: document.getElementById('winnerName'),
    winnerState: document.getElementById('winnerState'),
    winnerCity: document.getElementById('winnerCity'),
    winnerUnit: document.getElementById('winnerUnit'),
    winnerHighlight: document.getElementById('winnerHighlight'),
    confettiContainer: document.getElementById('confettiContainer')
};
const ctx = elements.canvas.getContext('2d');

// ===== VARIÁVEIS DE ESTADO =====
let wheelState = {
    names: [],
    numSegments: 0,
    anglePerSegment: 0,
    currentRotation: 0, // agora guardamos em radianos
    isSpinning: false,
    audioContext: null,
    highlightElement: null
};

const CANVAS_CONFIG = {
    width: elements.canvas.width,
    height: elements.canvas.height,
    center: elements.canvas.width / 2,
    radius: (elements.canvas.width / 2) - 10,
    textRadius: (elements.canvas.width / 2) * 0.7
};

// ===== ÁUDIO =====
function initAudio() {
    if (!AUDIO_CONFIG.enabled) return;
    try {
        wheelState.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
        AUDIO_CONFIG.enabled = false;
    }
}
function playTickSound() {
    if (!AUDIO_CONFIG.enabled || !wheelState.audioContext) return;
    const oscillator = wheelState.audioContext.createOscillator();
    const gainNode = wheelState.audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(wheelState.audioContext.destination);
    oscillator.frequency.setValueAtTime(AUDIO_CONFIG.tickFrequency, wheelState.audioContext.currentTime);
    oscillator.type = 'square';
    gainNode.gain.setValueAtTime(0.1, wheelState.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, wheelState.audioContext.currentTime + 0.1);
    oscillator.start();
    oscillator.stop(wheelState.audioContext.currentTime + 0.1);
}
function playWinSound() {
    if (!AUDIO_CONFIG.enabled || !wheelState.audioContext) return;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((f, i) => {
        setTimeout(() => {
            const osc = wheelState.audioContext.createOscillator();
            const g = wheelState.audioContext.createGain();
            osc.connect(g);
            g.connect(wheelState.audioContext.destination);
            osc.frequency.setValueAtTime(f, wheelState.audioContext.currentTime);
            osc.type = 'sine';
            g.gain.setValueAtTime(0.2, wheelState.audioContext.currentTime);
            g.gain.exponentialRampToValueAtTime(0.01, wheelState.audioContext.currentTime + 0.3);
            osc.start();
            osc.stop(wheelState.audioContext.currentTime + 0.3);
        }, i * 150);
    });
}

// ===== TEXTO / NOMES =====
function truncateName(name) {
    return name.length > WHEEL_CONFIG.maxNameLength 
        ? name.substring(0, WHEEL_CONFIG.maxNameLength) + '...' 
        : name;
}
function getNamesFromTextArea() {
    const text = elements.nameTextArea.value.trim();
    if (!text) return [];
    return text.split('\n')
              .map(n => n.trim())
              .filter(n => n.length > 0)
              .map(n => truncateName(n))
              .slice(0, 50);
}
function updateWheelData() {
    wheelState.names = getNamesFromTextArea();
    wheelState.numSegments = wheelState.names.length;
    wheelState.anglePerSegment = wheelState.numSegments > 0 
        ? (2 * Math.PI) / wheelState.numSegments 
        : 0;
}

// ===== DESTAQUE DO GANHADOR =====
function removeWinnerHighlight() {
    if (wheelState.highlightElement) {
        wheelState.highlightElement.remove();
        wheelState.highlightElement = null;
    }
}
function highlightWinnerInList(winnerName) {
    removeWinnerHighlight();
    const lines = elements.nameTextArea.value.split('\n');
    const lineHeight = parseInt(window.getComputedStyle(elements.nameTextArea).lineHeight);
    const paddingTop = parseInt(window.getComputedStyle(elements.nameTextArea).paddingTop);
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === winnerName) {
            wheelState.highlightElement = document.createElement('div');
            wheelState.highlightElement.className = 'winner-highlight-text';
            wheelState.highlightElement.textContent = '🏆 ' + lines[i].trim();
            wheelState.highlightElement.style.top = (paddingTop + lineHeight * i) + 'px';
            wheelState.highlightElement.style.left = '10px';
            elements.winnerHighlight.appendChild(wheelState.highlightElement);
            break;
        }
    }
}

// Função para abreviar nomes (máx. 8 caracteres + "…")
function abbreviateName(name, maxLength = 8) {
  return name.length > maxLength ? name.substring(0, maxLength) + "…" : name;
}


// ===== DESENHO =====
function drawWheel() {
    ctx.clearRect(0, 0, CANVAS_CONFIG.width, CANVAS_CONFIG.height);

    if (wheelState.numSegments === 0) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = '18px ' + getComputedStyle(document.body).fontFamily;
        ctx.fillText('📝 Adicione nomes na lista!', CANVAS_CONFIG.center, CANVAS_CONFIG.center);
        ctx.restore();
        return;
    }

    ctx.save();
    ctx.translate(CANVAS_CONFIG.center, CANVAS_CONFIG.center);
    ctx.rotate(wheelState.currentRotation);

    for (let i = 0; i < wheelState.numSegments; i++) {
        const startAngle = i * wheelState.anglePerSegment;
        const endAngle = startAngle + wheelState.anglePerSegment;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, CANVAS_CONFIG.radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = WHEEL_CONFIG.colors[i % WHEEL_CONFIG.colors.length];
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.save();
        ctx.rotate(startAngle + wheelState.anglePerSegment / 2);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = WHEEL_CONFIG.textColor;
        const fontSize = Math.max(10, 16 - (wheelState.numSegments * 0.3));
        ctx.font = `bold ${fontSize}px ${getComputedStyle(document.body).fontFamily}`;
        ctx.fillText(abbreviateName(wheelState.names[i]), CANVAS_CONFIG.textRadius, 0);
        ctx.restore();
    }

    ctx.restore();

    ctx.beginPath();
    ctx.arc(CANVAS_CONFIG.center, CANVAS_CONFIG.center, 30, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();
}

// ===== GIRO =====
function spinWheel() {
    if (wheelState.isSpinning) return;
    if (!wheelState.audioContext) initAudio();

    updateWheelData();
    if (wheelState.numSegments === 0) {
        alert('🚨 Adicione pelo menos um nome antes de girar a roleta!');
        elements.nameTextArea.focus();
        return;
    }

    wheelState.isSpinning = true;
    elements.spinButton.disabled = true;
    elements.nameTextArea.disabled = true;
    removeWinnerHighlight();

    elements.winnerDisplay.classList.remove('visible');
    elements.winnerPrefix.textContent = '';
    elements.winnerName.textContent = '';

    const minRotation = WHEEL_CONFIG.minSpins * 2 * Math.PI;
    const maxRotation = WHEEL_CONFIG.maxSpins * 2 * Math.PI;
    const randomRotation = minRotation + Math.random() * (maxRotation - minRotation);
    const startRotation = wheelState.currentRotation;
    const finalRotation = startRotation + randomRotation;

    const start = performance.now();

    function animate(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / WHEEL_CONFIG.spinDuration, 1);
        const eased = SPIN_CONFIG.easing(progress);
        wheelState.currentRotation = startRotation + randomRotation * eased;

        drawWheel();

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            wheelState.isSpinning = false;
            const normalized = (2 * Math.PI - (wheelState.currentRotation % (2 * Math.PI))) % (2 * Math.PI);
            const winnerIndex = Math.floor(normalized / wheelState.anglePerSegment);
            const winner = wheelState.names[winnerIndex];
            if (winner) {
                elements.winnerPrefix.textContent = '🎉 O vencedor é:';
                elements.winnerName.textContent = winner;
                elements.winnerDisplay.classList.add('visible');

                // Array com os nomes para pegar a unidade e a cidade
                const arrayNomes = [
                    {nome:"CASA DO AGRICULTOR SAO JUDAS TADEU",unidade:"Pouso Alegre",cidade:"PEDRALVA",estado:"MG"},
                    {nome:"L J COMERCIO DE ADUBOS",unidade:"Petrolina",cidade:"CHA GRANDE",estado:"PE"},
                    {nome:"COPEL COMERCIAL AGRO PECUARIA",unidade:"Sete Lagoas",cidade:"ARAGUARI",estado:"MG"},
                    {nome:"FERREIRA & GIANNINI COM E REPRES PROD AGRICOLAS",unidade:"Pouso Alegre",cidade:"ESPIRITO SANTO DO DOURADO",estado:"MG"},
                    {nome:"VETERINARIA NAKAO",unidade:"Lins",cidade:"URANIA",estado:"SP"},
                ];
                if(winnerIndex >= arrayNomes.length){
                    elements.winnerUnit.textContent = 'Unidade: ';
                    elements.winnerCity.textContent = 'Cidade: ';
                }
                else if(winner == arrayNomes[winnerIndex].nome){
                    elements.winnerUnit.textContent = 'Unidade: '+arrayNomes[winnerIndex].unidade;
                    elements.winnerCity.textContent = 'Cidade: '+arrayNomes[winnerIndex].cidade;
                }
                // if(winner == arrayNomes[winnerIndex].nome){
                //     console.log(arrayNomes[winnerIndex].estado);
                //     elements.winnerUnit.textContent = 'Unidade: '+arrayNomes[winnerIndex].unidade;
                //     elements.winnerCity.textContent = 'Cidade: '+arrayNomes[winnerIndex].cidade;
                // }
                // else if(winnerIndex > arrayNomes.length){
                //     console.log("Não existem dados cadastrados");
                // }
                console.log('Ganhador '+winner+' '+winnerIndex);


                highlightWinnerInList(winner);
                playWinSound();
            }
            elements.spinButton.disabled = false;
            elements.nameTextArea.disabled = false;
        }
    }

    requestAnimationFrame(animate);
}

// ===== EVENTOS =====
elements.spinButton.addEventListener('click', spinWheel);
elements.nameTextArea.addEventListener('input', () => {
    removeWinnerHighlight();
    updateWheelData();
    drawWheel();
});

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    elements.nameTextArea.value = `CASA DO AGRICULTOR SAO JUDAS TADEU\nL J COMERCIO DE ADUBOS\nCOPEL COMERCIAL AGRO PECUARIA\nFERREIRA & GIANNINI COM E REPRES PROD AGRICOLAS\nVETERINARIA NAKAO`;
    updateWheelData();
    drawWheel();
    console.log('🎯 Roleta inicializada!');
    
});
