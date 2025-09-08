        // ===== CONFIGURAÇÕES GERAIS =====
        /* Configurações básicas da roleta e dos efeitos */
        
        // Configurações da roleta
        const WHEEL_CONFIG = {
            colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'],
            spinDuration: 4000, // Duração do giro em milissegundos
            minSpins: 8, // Número mínimo de voltas completas
            maxSpins: 25, // Número máximo de voltas completas
            textColor: '#2c3e50',
            maxNameLength: 7 // Tamanho máximo do nome na entrada e roleta
        };

        // Configurações de áudio (geramos sons usando Web Audio API)
        const AUDIO_CONFIG = {
            enabled: true,
            tickFrequency: 800, // Frequência do som de tick
            winFrequency: 600   // Frequência do som de vitória
        };

        // ===== ELEMENTOS DO DOM =====
        /* Referências para todos os elementos HTML que vamos manipular */
        const elements = {
            canvas: document.getElementById('wheelCanvas'),
            spinButton: document.getElementById('spinButton'),
            nameTextArea: document.getElementById('nameTextArea'),
            winnerDisplay: document.getElementById('winnerDisplay'),
            winnerState: document.getElementById('winnerState'),
            winnerCity: document.getElementById('winnerCity'),
            winnerUnit: document.getElementById('winnerUnit'),
            winnerPrefix: document.getElementById('winnerPrefix'),
            winnerName: document.getElementById('winnerName'),
            winnerHighlight: document.getElementById('winnerHighlight'),
            confettiContainer: document.getElementById('confettiContainer')
        };

        // Contexto do canvas para desenhar a roleta
        const ctx = elements.canvas.getContext('2d');

        // ===== VARIÁVEIS DE ESTADO =====
        /* Variáveis que controlam o estado atual da aplicação */
        let wheelState = {
            names: [],              // Lista de nomes dos participantes
            estados: [],              // Lista de nomes dos participantes
            cidades: [],              // Lista de nomes dos participantes
            numSegments: 0,         // Número de segmentos na roleta
            anglePerSegment: 0,     // Ângulo de cada segmento
            currentRotation: 0,     // Rotação atual da roleta
            isSpinning: false,      // Se a roleta está girando
            audioContext: null,     // Contexto de áudio para sons
            highlightElement: null  // Elemento de destaque do ganhador
        };

        // Configurações do canvas
        const CANVAS_CONFIG = {
            width: elements.canvas.width,
            height: elements.canvas.height,
            center: elements.canvas.width / 2,
            radius: (elements.canvas.width / 2) - 10,
            textRadius: (elements.canvas.width / 2) * 0.7
        };

        // ===== FUNÇÕES DE ÁUDIO =====
        /* Funções para gerar e reproduzir sons usando Web Audio API */
        
        // Inicializa o contexto de áudio
        function initAudio() {
            if (!AUDIO_CONFIG.enabled) return;
            
            try {
                wheelState.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.warn('Web Audio API não suportada');
                AUDIO_CONFIG.enabled = false;
            }
        }

        // Reproduz um som de tick durante o giro
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

        // Reproduz um som de vitória
        function playWinSound() {
            if (!AUDIO_CONFIG.enabled || !wheelState.audioContext) return;
            
            // Sequência de notas para o som de vitória
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
            
            notes.forEach((frequency, index) => {
                setTimeout(() => {
                    const oscillator = wheelState.audioContext.createOscillator();
                    const gainNode = wheelState.audioContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(wheelState.audioContext.destination);
                    
                    oscillator.frequency.setValueAtTime(frequency, wheelState.audioContext.currentTime);
                    oscillator.type = 'sine';
                    
                    gainNode.gain.setValueAtTime(0.2, wheelState.audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, wheelState.audioContext.currentTime + 0.3);
                    
                    oscillator.start();
                    oscillator.stop(wheelState.audioContext.currentTime + 0.3);
                }, index * 150);
            });
        }

        // ===== FUNÇÕES DE EFEITOS VISUAIS =====
        /* Funções para criar efeitos visuais como confetes */
        
        // Cria efeito de confetes
        function createConfetti() {
            const colors = WHEEL_CONFIG.colors;
            const confettiCount = 50;
            
            for (let i = 0; i < confettiCount; i++) {
                setTimeout(() => {
                    const confetti = document.createElement('div');
                    confetti.className = 'confetti';
                    confetti.style.left = Math.random() * 100 + '%';
                    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                    confetti.style.animationDelay = Math.random() * 2 + 's';
                    confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
                    
                    elements.confettiContainer.appendChild(confetti);
                    
                    // Remove o confete após a animação
                    setTimeout(() => {
                        confetti.remove();
                    }, 5000);
                }, i * 50);
            }
        }

        // ===== FUNÇÕES DE MANIPULAÇÃO DE TEXTO =====
        /* Funções para processar e validar os nomes inseridos */
        
        // Trunca nomes muito longos
        function truncateName(name) {
            return name.length > WHEEL_CONFIG.maxNameLength 
                ? name.substring(0, WHEEL_CONFIG.maxNameLength) + '...' 
                : name;
        }

        
        // Obtém a lista de nomes válidos da textarea
        function getNamesFromTextArea() {
            const text = elements.nameTextArea.value.trim();
            if (!text) return [];
            
            return text.split('\n')
                      .map(name => name.trim())
                      .filter(name => name.length > 0)
                      .map(name => name)
                      .slice(0, 50); // Limite máximo de 50 nomes
        }

        // Array de nomes
            const arrayNomes = [
                {nome:"CASA DO AGRICULTOR SAO JUDAS TADEU",unidade:"Pouso Alegre",cidade:"PEDRALVA",estado:"MG"},
                {nome:"L J COMERCIO DE ADUBOS",unidade:"Petrolina",cidade:"CHA GRANDE",estado:"PE"},
                {nome:"COPEL COMERCIAL AGRO PECUARIA",unidade:"Sete Lagoas",cidade:"ARAGUARI",estado:"BA"},
                {nome:"FERREIRA & GIANNINI COM E REPRES PROD AGRICOLAS",unidade:"Pouso Alegre",cidade:"PEDRALVA",estado:"MG"},
                {nome:"VETERINARIA NAKAO",unidade:"Lins",cidade:"URANIA",estado:"SP"},
            ];
        // Pegando os estados
            function getEstados(entrada){
                    estados = [];
                    if(entrada){
                        entrada.forEach(element => {
                            estados.push(element.estado);
                        });
                    }
                    return estados;
            }
        // Pegando unidades
            function getUnidades(entrada){
                    unidades = [];
                    if(entrada){
                        entrada.forEach(element => {
                            unidades.push(element.unidade);
                        });
                    }
                    return unidades;
            }
        // Cidades
            function getCidades(entrada){
                    cidades = [];
                    if(entrada){
                        entrada.forEach(element => {
                            cidades.push(element.cidade);
                        });
                    }
                    return cidades;
            }
        // Atualiza os dados da roleta baseado nos nomes inseridos
            function updateWheelData() {
                wheelState.names = getNamesFromTextArea();
                wheelState.estados = getEstados(arrayNomes);
                wheelState.cidades = getCidades(arrayNomes);
                wheelState.unidades = getUnidades(arrayNomes);
                wheelState.numSegments = wheelState.names.length;
                wheelState.anglePerSegment = wheelState.numSegments > 0 
                    ? (2 * Math.PI) / wheelState.numSegments 
                    : 0;
            }

        // ===== FUNÇÕES DE DESTAQUE DO GANHADOR =====
        /* Funções para destacar o nome do ganhador na lista */
        
        // Encontra a posição de um nome na textarea
        function findNamePositionInTextarea(targetName) {
            const lines = elements.nameTextArea.value.split('\n');
            const lineHeight = parseInt(window.getComputedStyle(elements.nameTextArea).lineHeight);
            const paddingTop = parseInt(window.getComputedStyle(elements.nameTextArea).paddingTop);
            
            for (let i = 0; i < lines.length; i++) {
                const processedLine = lines[i].trim();
                if (processedLine === targetName && lines[i].trim().length > 0) {
                    return {
                        top: paddingTop + (lineHeight * i),
                        text: lines[i].trim()
                    };
                }
            }
            return null;
        }

        // Destaca o nome do ganhador na lista
        function highlightWinnerInList(winnerName) {
            removeWinnerHighlight();
            
            const position = findNamePositionInTextarea(winnerName);
            if (!position) return;
            
            wheelState.highlightElement = document.createElement('div');
            wheelState.highlightElement.className = 'winner-highlight-text';
            wheelState.highlightElement.textContent = '🏆 ' + position.text;
            wheelState.highlightElement.style.top = position.top + 'px';
            wheelState.highlightElement.style.left = '10px';
            
            elements.winnerHighlight.appendChild(wheelState.highlightElement);
        }

        // Remove o destaque do ganhador
        function removeWinnerHighlight() {
            if (wheelState.highlightElement) {
                wheelState.highlightElement.remove();
                wheelState.highlightElement = null;
            }
        }

        // ===== FUNÇÕES DE DESENHO DA ROLETA =====
        /* Funções para desenhar a roleta no canvas */
        
        // Desenha um segmento individual da roleta
        function drawSegment(index, startAngle, endAngle, name) {
            const color = WHEEL_CONFIG.colors[index % WHEEL_CONFIG.colors.length];
            
            // Aplica a rotação atual
            const rotatedStart = startAngle - (wheelState.currentRotation * Math.PI / 180);
            const rotatedEnd = endAngle - (wheelState.currentRotation * Math.PI / 180);
            
            // Desenha o segmento
            ctx.beginPath();
            ctx.moveTo(CANVAS_CONFIG.center, CANVAS_CONFIG.center);
            ctx.arc(CANVAS_CONFIG.center, CANVAS_CONFIG.center, CANVAS_CONFIG.radius, rotatedStart, rotatedEnd);
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.fill();
            
            // Desenha a borda do segmento
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Desenha o texto do nome
            ctx.save();
            ctx.translate(CANVAS_CONFIG.center, CANVAS_CONFIG.center);
            ctx.rotate(rotatedStart + wheelState.anglePerSegment / 2);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = WHEEL_CONFIG.textColor;
            
            // Ajusta o tamanho da fonte baseado no número de segmentos
            const fontSize = Math.max(10, 16 - (wheelState.numSegments * 0.3));
            ctx.font = `bold ${fontSize}px ${getComputedStyle(document.body).fontFamily}`;
            
            ctx.fillText(truncateName(name), CANVAS_CONFIG.textRadius, 0);
            ctx.restore();
        }

        // Desenha a roleta completa
        function drawWheel() {
            // Limpa o canvas
            ctx.clearRect(0, 0, CANVAS_CONFIG.width, CANVAS_CONFIG.height);
            
            if (wheelState.numSegments === 0) {
                // Desenha mensagem quando não há nomes
                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.font = '18px ' + getComputedStyle(document.body).fontFamily;
                ctx.fillText('📝 Adicione nomes na lista!', CANVAS_CONFIG.center, CANVAS_CONFIG.center);
                ctx.restore();
                return;
            }
            
            // Desenha todos os segmentos
            for (let i = 0; i < wheelState.numSegments; i++) {
                const startAngle = i * wheelState.anglePerSegment;
                const endAngle = startAngle + wheelState.anglePerSegment;
                drawSegment(i, startAngle, endAngle, wheelState.names[i]);
            }
            
            // Desenha o círculo central
            ctx.beginPath();
            ctx.arc(CANVAS_CONFIG.center, CANVAS_CONFIG.center, 30, 0, 2 * Math.PI);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // ===== FUNÇÃO PRINCIPAL DE GIRO =====
        /* Função principal que executa o giro da roleta */
        
        function spinWheel() {
            // Verifica se já está girando
            if (wheelState.isSpinning) return;
            
            // Inicializa o áudio se necessário
            if (!wheelState.audioContext) {
                initAudio();
            }
            
            // Atualiza os dados e verifica se há nomes
            updateWheelData();
            if (wheelState.numSegments === 0) {
                alert('🚨 Adicione pelo menos um nome antes de girar a roleta!');
                elements.nameTextArea.focus();
                return;
            }
            
            // Prepara o estado para o giro
            wheelState.isSpinning = true;
            elements.spinButton.disabled = true;
            elements.nameTextArea.disabled = true;
            removeWinnerHighlight();
            
            // Oculta o resultado anterior
            elements.winnerDisplay.classList.remove('visible');
            elements.winnerPrefix.textContent = '';
            elements.winnerName.textContent = '';
            
            // Calcula a rotação final
            const minRotation = WHEEL_CONFIG.minSpins * 360;
            const maxRotation = WHEEL_CONFIG.maxSpins * 360;
            const randomRotation = minRotation + Math.random() * (maxRotation - minRotation);
            const finalRotation = wheelState.currentRotation + randomRotation;
            
            // Reproduz sons de tick durante o giro
            const tickInterval = setInterval(() => {
                if (wheelState.isSpinning) {
                    playTickSound();
                } else {
                    clearInterval(tickInterval);
                }
            }, 100);
            
            // Aplica a animação de rotação
            elements.canvas.style.transform = `rotate(${finalRotation}deg)`;
            wheelState.currentRotation = finalRotation % 360;
            
            // Após o giro, determina o vencedor
            setTimeout(() => {
                wheelState.isSpinning = false;
                clearInterval(tickInterval);
                
                // Calcula o vencedor baseado na posição final
                const normalizedRotation = (360 - (wheelState.currentRotation % 360)) % 360;
                const winnerIndex = Math.floor(normalizedRotation / (360 / wheelState.numSegments));
                const winner = wheelState.names[winnerIndex];
                const state = wheelState.estados[winnerIndex];
                const units = wheelState.unidades[winnerIndex];
                const citys = wheelState.cidades[winnerIndex];
                
                if (winner) {
                    // Exibe o resultado
                    elements.winnerPrefix.textContent = '🎉 O vencedor é:';
                    elements.winnerName.textContent = winner;
                    elements.winnerUnit.textContent = 'Unidade: '+units;
                    elements.winnerCity.textContent = 'Cidade: '+citys;
                    elements.winnerDisplay.classList.add('visible');
                    
                    // Destaca o ganhador na lista
                    highlightWinnerInList(winner);
                    
                    // Reproduz som de vitória e efeito de confetes
                    playWinSound();
                    createConfetti();
                    
                    console.log(`🏆 Vencedor: ${winner} (Índice: ${winnerIndex})`);
                } else {
                    elements.winnerPrefix.textContent = '❌ Erro ao determinar vencedor';
                    elements.winnerDisplay.classList.add('visible');
                }
                
                // Reabilita os controles
                elements.spinButton.disabled = false;
                elements.nameTextArea.disabled = false;
                
            }, WHEEL_CONFIG.spinDuration);
        }

        // ===== AUTO-RESIZE DA TEXTAREA =====
        /* Função para ajustar automaticamente a altura da textarea */
        function autoResizeTextarea() {
            elements.nameTextArea.style.height = 'auto';
            elements.nameTextArea.style.height = elements.nameTextArea.scrollHeight + 'px';
        }

        // ===== INICIALIZAÇÃO E EVENT LISTENERS =====
        /* Configuração inicial e eventos da aplicação */
        
        // Event listener para o botão de giro
        elements.spinButton.addEventListener('click', spinWheel);
        
        // Event listener para mudanças na textarea
        elements.nameTextArea.addEventListener('input', function(e) {
            removeWinnerHighlight();
            
            // Validar e limitar caracteres por linha
            const lines = this.value.split('\n');
            let hasChanged = false;
            
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].length > WHEEL_CONFIG.maxNameLength) {
                    lines[i] = lines[i].substring(0, WHEEL_CONFIG.maxNameLength);
                    hasChanged = true;
                }
            }
            
            if (hasChanged) {
                const cursorPosition = this.selectionStart;
                this.value = lines.join('\n');
                this.setSelectionRange(cursorPosition, cursorPosition);
            }
            
            autoResizeTextarea();
            
            // Debounce para atualizar a roleta
            clearTimeout(this.updateTimer);
            this.updateTimer = setTimeout(() => {
                updateWheelData();
                drawWheel();
            }, 300);
        });
        
        // Event listener para colar texto
        elements.nameTextArea.addEventListener('paste', function() {
            removeWinnerHighlight();
            setTimeout(() => {
                autoResizeTextarea();
                updateWheelData();
                drawWheel();
            }, 0);
        });
        
        // Inicialização da aplicação
        function initializeApp() {
            const people = {
            names: `João Silva
Maria Santos
Pedro Costa
Ana Oliveira
Carlos Mendes
Lucia Ferreira
Roberto Lima
Gabriel Batista`};

            const arrayNomes = [
                {nome:"CASA DO AGRICULTOR SAO JUDAS TADEU",unidade:"Pouso Alegre",cidade:"PEDRALVA",estado:"MG"},
                {nome:"L J COMERCIO DE ADUBOS",unidade:"Petrolina",cidade:"CHA GRANDE",estado:"PE"},
                {nome:"COPEL COMERCIAL AGRO PECUARIA",unidade:"Sete Lagoas",cidade:"ARAGUARI",estado:"BA"},
                {nome:"FERREIRA & GIANNINI COM E REPRES PROD AGRICOLAS",unidade:"Pouso Alegre",cidade:"PEDRALVA",estado:"MG"},
                {nome:"VETERINARIA NAKAO",unidade:"Lins",cidade:"URANIA",estado:"SP"},
            ];

            



            let objNomes = '';
            for(let nomes of arrayNomes){
                
                objNomes += nomes.nome+'\n';
                
            }
            // console.log(objNomes);
            // Adiciona nomes de exemplo
            elements.nameTextArea.value = objNomes;
            // elements.nameTextArea.value = `João Silva (Pouso Alegre)
            // Maria Santos
            // Pedro Costa
            // Ana Oliveira
            // Carlos Mendes
            // Lucia Ferreira
            // Roberto Lima
            // Gabriel Batista`;     
            // Configura o estado inicial
            updateWheelData();
            drawWheel();
            autoResizeTextarea();
            
            console.log('🎯 Roleta Moderna inicializada com sucesso!');
        }
        
        // Inicializa quando a página carrega
        document.addEventListener('DOMContentLoaded', initializeApp);
        
        // ===== MELHORIAS DE ACESSIBILIDADE =====
        /* Suporte a teclado e outras funcionalidades de acessibilidade */
        
        // Permite girar com Enter quando o botão está focado
        elements.spinButton.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                spinWheel();
            }
        });
        
        // Permite girar com Ctrl+Enter na textarea
        elements.nameTextArea.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                spinWheel();
            }
        });