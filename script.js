document.addEventListener('DOMContentLoaded', () => {
    // Game elements
    const gameBoard = document.getElementById('game-board');
    const settingsButton = document.getElementById('settings-button');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsButton = document.getElementById('close-settings');
    const applySettingsButton = document.getElementById('apply-settings');
    const lettersMode = document.getElementById('letters-mode');
    const numbersMode = document.getElementById('numbers-mode');
    const easyMode = document.getElementById('easy-mode');
    const mediumMode = document.getElementById('medium-mode');
    const matchCount = document.getElementById('match-count');
    const totalPairsElement = document.getElementById('total-pairs');
    const attemptCount = document.getElementById('attempt-count');
    const progressFill = document.getElementById('progress-fill');
    const successModal = document.getElementById('success-modal');
    const finalAttempts = document.getElementById('final-attempts');
    const playAgainButton = document.getElementById('play-again');
    const confettiWrapper = document.querySelector('.confetti-wrapper');

    // Game state
    let firstCard = null;
    let secondCard = null;
    let lockBoard = false;
    let matches = 0;
    let attempts = 0;
    let totalPairs = 6; // Default (easy mode)
    let cardsData = [];
    
    // Settings modal controls
    settingsButton.addEventListener('click', () => {
        settingsModal.classList.add('active');
        settingsModal.setAttribute('aria-hidden', 'false');
    });
    
    closeSettingsButton.addEventListener('click', () => {
        settingsModal.classList.remove('active');
        settingsModal.setAttribute('aria-hidden', 'true');
    });
    
    applySettingsButton.addEventListener('click', () => {
        settingsModal.classList.remove('active');
        settingsModal.setAttribute('aria-hidden', 'true');
        startGame();
    });
    
    // Game mode and difficulty listeners
    easyMode.addEventListener('change', () => {
        if (easyMode.checked) totalPairs = 6;
        totalPairsElement.textContent = totalPairs;
    });

    mediumMode.addEventListener('change', () => {
        if (mediumMode.checked) totalPairs = 9;
        totalPairsElement.textContent = totalPairs;
    });

    // Initialize game
    playAgainButton.addEventListener('click', () => {
        successModal.classList.remove('active');
        successModal.setAttribute('aria-hidden', 'true');
        startGame();
    });

    // Generate the card data based on game mode
    function generateCardsData() {
        cardsData = [];
        
        if (lettersMode.checked) {
            // Letters A-Z (uppercase and lowercase pairs)
            const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            const selectedLetters = letters.substring(0, totalPairs);
            
            for (let i = 0; i < selectedLetters.length; i++) {
                const letter = selectedLetters[i];
                cardsData.push(
                    { id: `upper-${letter}`, value: letter, class: 'uppercase', match: `lower-${letter.toLowerCase()}` },
                    { id: `lower-${letter.toLowerCase()}`, value: letter.toLowerCase(), class: 'lowercase', match: `upper-${letter}` }
                );
            }
        } else {
            // Numbers 1-9 with their quantities
            const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9].slice(0, totalPairs);
            
            for (let i = 0; i < numbers.length; i++) {
                const num = numbers[i];
                cardsData.push(
                    { id: `num-${num}`, value: num, class: 'number-symbol', match: `count-${num}` },
                    { 
                        id: `count-${num}`, 
                        value: num, 
                        class: 'number-count', 
                        match: `num-${num}`,
                        count: num
                    }
                );
            }
        }
        
        return shuffleArray(cardsData);
    }

    // Fisher-Yates shuffle algorithm
    function shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    // Create a card element
    function createCard(data) {
        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.id = data.id;
        card.dataset.match = data.match;
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', getCardAriaLabel(data));
        card.setAttribute('aria-pressed', 'false');
        
        const cardInner = document.createElement('div');
        cardInner.className = 'card-inner';
        
        const cardFront = document.createElement('div');
        cardFront.className = 'card-front';
        
        if (data.class === 'number-count') {
            // Create dots representing the number
            const countContainer = document.createElement('div');
            countContainer.className = data.class;
            
            for (let i = 0; i < data.count; i++) {
                const dot = document.createElement('span');
                dot.className = 'number-count-item';
                countContainer.appendChild(dot);
            }
            
            cardFront.appendChild(countContainer);
        } else {
            // Simple text content
            const cardContent = document.createElement('span');
            cardContent.className = data.class;
            cardContent.textContent = data.value;
            cardFront.appendChild(cardContent);
        }
        
        const cardBack = document.createElement('div');
        cardBack.className = 'card-back';
        cardBack.innerHTML = '<span class="material-icons">help</span>';
        
        cardInner.appendChild(cardFront);
        cardInner.appendChild(cardBack);
        card.appendChild(cardInner);
        
        card.addEventListener('click', flipCard);
        card.addEventListener('keydown', handleCardKeydown);
        
        return card;
    }

    // Get appropriate aria label for each card type
    function getCardAriaLabel(data) {
        if (data.class === 'uppercase') {
            return `Uppercase letter ${data.value}`;
        } else if (data.class === 'lowercase') {
            return `Lowercase letter ${data.value}`;
        } else if (data.class === 'number-symbol') {
            return `Number ${data.value}`;
        } else if (data.class === 'number-count') {
            return `${data.count} dots representing the number ${data.count}`;
        }
        return 'Card';
    }

    // Handle keyboard navigation for cards
    function handleCardKeydown(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.click();
        }
    }

    // Flip a card - FIXED to ensure proper flipping
    function flipCard() {
        if (lockBoard) return;
        if (this === firstCard) return;
        
        this.classList.add('flipped');
        this.setAttribute('aria-pressed', 'true');
        
        if (!firstCard) {
            firstCard = this;
            return;
        }
        
        secondCard = this;
        checkForMatch();
    }

    // Check if the two flipped cards match
    function checkForMatch() {
        lockBoard = true;
        attempts++;
        attemptCount.textContent = attempts;
        
        const isMatch = firstCard.dataset.match === secondCard.dataset.id;
        
        if (isMatch) {
            disableCards();
            matches++;
            matchCount.textContent = matches;
            updateProgress();
            
            // Add visual feedback for matches
            firstCard.classList.add('matched-animation');
            secondCard.classList.add('matched-animation');
            setTimeout(() => {
                firstCard.classList.remove('matched-animation');
                secondCard.classList.remove('matched-animation');
            }, 1000);
            
            if (matches === totalPairs) {
                setTimeout(() => {
                    showSuccessModal();
                }, 500);
            }
        } else {
            unflipCards();
            // Add visual feedback for non-matches
            firstCard.classList.add('no-match-animation');
            secondCard.classList.add('no-
                firstCard.classList.add('no-match-animation');
            secondCard.classList.add('no-match-animation');
            setTimeout(() => {
                firstCard.classList.remove('no-match-animation');
                secondCard.classList.remove('no-match-animation');
            }, 1000);
        }
    }

    // Disable matched cards
    function disableCards() {
        firstCard.classList.add('matched');
        secondCard.classList.add('matched');
        
        firstCard.removeEventListener('click', flipCard);
        secondCard.removeEventListener('click', flipCard);
        
        resetBoard();
    }

    // Unflip cards that don't match
    function unflipCards() {
        setTimeout(() => {
            firstCard.classList.remove('flipped');
            secondCard.classList.remove('flipped');
            
            firstCard.setAttribute('aria-pressed', 'false');
            secondCard.setAttribute('aria-pressed', 'false');
            
            resetBoard();
        }, 1000);
    }

    // Reset the board after a turn
    function resetBoard() {
        [firstCard, secondCard] = [null, null];
        lockBoard = false;
    }
    
    // Update progress bar
    function updateProgress() {
        const percentage = (matches / totalPairs) * 100;
        progressFill.style.width = `${percentage}%`;
    }
    
    // Create confetti effect
    function createConfetti() {
        if (!confettiWrapper) return; // Skip if element doesn't exist
        
        confettiWrapper.innerHTML = '';
        const colors = ['#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50'];
        
        for (let i = 0; i < 100; i++) {
            const confetti = document.createElement('div');
            confetti.style.position = 'absolute';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.width = Math.random() * 10 + 5 + 'px';
            confetti.style.height = Math.random() * 10 + 5 + 'px';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.opacity = Math.random() + 0.5;
            confetti.style.top = -20 + 'px';
            confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
            confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
            confetti.style.animation = `fall ${Math.random() * 3 + 2}s linear`;
            
            confettiWrapper.appendChild(confetti);
        }
    }

    // Display success modal
    function showSuccessModal() {
        finalAttempts.textContent = attempts;
        if (confettiWrapper) {
            createConfetti();
        }
        successModal.classList.add('active');
        successModal.setAttribute('aria-hidden', 'false');
        playAgainButton.focus();
    }

    // Start a new game
    function startGame() {
        // Reset game state
        gameBoard.innerHTML = '';
        matches = 0;
        attempts = 0;
        matchCount.textContent = '0';
        attemptCount.textContent = '0';
        resetBoard();
        
        // Update total pairs based on difficulty
        if (easyMode.checked) {
            totalPairs = 6;
        } else if (mediumMode.checked) {
            totalPairs = 9;
        }
        
        totalPairsElement.textContent = totalPairs;
        updateProgress();
        
        // Generate and shuffle cards
        const shuffledCards = generateCardsData();
        
        // Update board layout based on difficulty
        if (mediumMode.checked) {
            gameBoard.classList.add('medium');
        } else {
            gameBoard.classList.remove('medium');
        }
        
        // Create and append cards to the game board
        shuffledCards.forEach((cardData, index) => {
            const card = createCard(cardData);
            
            // Add entry animation
            card.style.opacity = '0';
            card.style.transform = 'scale(0.8)';
            
            gameBoard.appendChild(card);
            
            // Trigger animation with a slight delay based on index
            setTimeout(() => {
                card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                card.style.opacity = '1';
                card.style.transform = 'scale(1)';
            }, index * 50);
        });
    }

    // Start the game on load
    startGame();
});