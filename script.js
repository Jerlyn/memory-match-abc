document.addEventListener('DOMContentLoaded', () => {
    // Game elements
    const gameBoard = document.getElementById('game-board');
    const startButton = document.getElementById('start-button');
    const lettersMode = document.getElementById('letters-mode');
    const numbersMode = document.getElementById('numbers-mode');
    const easyMode = document.getElementById('easy-mode');
    const mediumMode = document.getElementById('medium-mode');
    const matchCount = document.getElementById('match-count');
    const attemptCount = document.getElementById('attempt-count');
    const successModal = document.getElementById('success-modal');
    const finalAttempts = document.getElementById('final-attempts');
    const playAgainButton = document.getElementById('play-again');

    // Game state
    let firstCard = null;
    let secondCard = null;
    let lockBoard = false;
    let matches = 0;
    let attempts = 0;
    let totalPairs = 6; // Default (easy mode)
    let cardsData = [];

    // Sound effects (optional)
    const successSound = new Audio('https://assets.mixkit.co/active_storage/sfx/933/933-preview.mp3');
    const matchSound = new Audio('https://assets.mixkit.co/active_storage/sfx/270/270-preview.mp3');
    const flipSound = new Audio('https://assets.mixkit.co/active_storage/sfx/240/240-preview.mp3');

    // Initialize game
    startButton.addEventListener('click', startGame);
    playAgainButton.addEventListener('click', () => {
        successModal.classList.remove('active');
        successModal.setAttribute('aria-hidden', 'true');
        startGame();
    });

    // Game mode and difficulty listeners
    easyMode.addEventListener('change', () => {
        if (easyMode.checked) totalPairs = 6;
    });

    mediumMode.addEventListener('change', () => {
        if (mediumMode.checked) totalPairs = 9;
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
                        value: Array(num).fill('•').join(''), 
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
        cardBack.textContent = '?';
        
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

    // Flip a card
    function flipCard() {
        if (lockBoard) return;
        if (this === firstCard) return;
        
        this.classList.add('flipped');
        this.setAttribute('aria-pressed', 'true');
        flipSound.play().catch(e => console.log('Audio play failed:', e));
        
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
            matchSound.play().catch(e => console.log('Audio play failed:', e));
            
            // Announce the match for screen readers
            const matchAnnouncement = document.createElement('div');
            matchAnnouncement.setAttribute('aria-live', 'polite');
            matchAnnouncement.className = 'sr-only';
            matchAnnouncement.textContent = `Match found! ${matches} out of ${totalPairs} pairs matched.`;
            document.body.appendChild(matchAnnouncement);
            setTimeout(() => document.body.removeChild(matchAnnouncement), 1000);
            
            if (matches === totalPairs) {
                setTimeout(() => {
                    showSuccessModal();
                }, 500);
            }
        } else {
            unflipCards();
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

    // Display success modal
    function showSuccessModal() {
        successSound.play().catch(e => console.log('Audio play failed:', e));
        finalAttempts.textContent = attempts;
        successModal.classList.add('active');
        successModal.setAttribute('aria-hidden', 'false');
        document.getElementById('play-again').focus();
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
        
        // Generate and shuffle cards
        const shuffledCards = generateCardsData();
        
        // Update board layout based on difficulty
        if (mediumMode.checked) {
            gameBoard.classList.add('medium');
        } else {
            gameBoard.classList.remove('medium');
        }
        
        // Create and append cards to the game board
        shuffledCards.forEach(cardData => {
            const card = createCard(cardData);
            gameBoard.appendChild(card);
        });
        
        // Announce game start for screen readers
        const startAnnouncement = document.createElement('div');
        startAnnouncement.setAttribute('aria-live', 'polite');
        startAnnouncement.className = 'sr-only';
        startAnnouncement.textContent = `New game started with ${totalPairs} pairs to match.`;
        document.body.appendChild(startAnnouncement);
        setTimeout(() => document.body.removeChild(startAnnouncement), 1000);
    }

    // Start the game on load
    startGame();
});
