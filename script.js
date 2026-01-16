
// State
let currentQuestionIndex = 0;
let userAnswers = [];

// DOM Elements
const elements = {
    cardContainer: document.getElementById('card-container'), 
    prevBtn: document.getElementById('prev-btn'),
    nextBtn: document.getElementById('next-btn'), 
    finishBtn: document.getElementById('finish-btn'),
    progressBar: document.getElementById('progress-bar'), 
    navigation: document.getElementById('navigation'),
    resultsContainer: document.getElementById('results-container'), 
    quizHeader: document.querySelector('.quiz-header')
};

// Initialize
function init() {
    if (!window.quizData) {
        console.error("Quiz data not found!");
        return;
    }

    // Shuffle Options for Variety
    if (window.quizData) {
        window.quizData.forEach(q => {
            // Store correct answer text before shuffling
            const correctAnswerText = q.options[q.answerIndex];
            
            // Shuffle options
            for (let i = q.options.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [q.options[i], q.options[j]] = [q.options[j], q.options[i]];
            }
            
            // Update answerIndex to match new position
            q.answerIndex = q.options.indexOf(correctAnswerText);
        });
    }

    userAnswers = new Array(quizData.length).fill(null);
    buildCards();
    
    // Set initial state
    document.getElementById('card-0').classList.add('active');
    updateNavigation();
    updateProgress();
    
    // Event Listeners
    elements.nextBtn.onclick = () => changeQuestion('next'); 
    elements.prevBtn.onclick = () => changeQuestion('prev');
    elements.finishBtn.onclick = showResults;
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (elements.resultsContainer.classList.contains('hidden')) {
            if (e.key === 'ArrowRight' && !elements.nextBtn.disabled && !elements.nextBtn.classList.contains('hidden')) {
                changeQuestion('next');
            } else if (e.key === 'ArrowLeft' && !elements.prevBtn.classList.contains('hidden')) {
                changeQuestion('prev');
            }
        }
    });

    // Resize observer/listener
    window.addEventListener('resize', adjustContainerHeight);
    
    // Initial height set after a brief tick to allow rendering
    setTimeout(adjustContainerHeight, 50);
}

// Logic
function buildCards() {
    elements.cardContainer.innerHTML = '';
    quizData.forEach((q, index) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.id = `card-${index}`;
        
        const optionsHTML = q.options.map((option, optIndex) => `
            <button class="option" data-index="${optIndex}">
                ${option}
            </button>
        `).join('');
        
        // Add syntax highlighting to code blocks in question if present
        // Note: The structure expects <p class="question-text"> but we can handle HTML in question string
        card.innerHTML = `
            <div class="question-text">
                <span style="color: var(--accent-primary); font-family: 'Space Grotesk'; margin-right: 0.5rem;">${index + 1}.</span> 
                ${q.question}
            </div>
            <div class="options-container" data-question-index="${index}">
                ${optionsHTML}
            </div>
        `;
        elements.cardContainer.appendChild(card);
    });
    
    document.querySelectorAll('.option').forEach(option => {
        option.addEventListener('click', handleOptionClick);
    });
}

function handleOptionClick(event) {
    const selectedOption = event.target.closest('.option');
    if (!selectedOption) return;
    
    const optionsContainer = selectedOption.parentElement;
    const questionIndex = parseInt(optionsContainer.dataset.questionIndex);
    
    // Prevent re-answering
    if (userAnswers[questionIndex] !== null) return;
    
    const selectedOptionIndex = parseInt(selectedOption.dataset.index);
    optionsContainer.classList.add('answered');
    
    userAnswers[questionIndex] = { selected: selectedOptionIndex };
    
    const correctOptionIndex = quizData[questionIndex].answerIndex;
    const isCorrect = selectedOptionIndex === correctOptionIndex;
    userAnswers[questionIndex].isCorrect = isCorrect;
    
    const correctOptionElement = optionsContainer.querySelector(`.option[data-index="${correctOptionIndex}"]`);
    correctOptionElement.classList.add('correct');
    
    if (!isCorrect) {
        selectedOption.classList.add('incorrect');
    }
    
    updateNavigation();
}

function changeQuestion(direction) {
    const oldIndex = currentQuestionIndex;
    
    if (direction === 'next' && currentQuestionIndex < quizData.length - 1) {
        currentQuestionIndex++;
    } else if (direction === 'prev' && currentQuestionIndex > 0) {
        currentQuestionIndex--;
    }
    
    if (oldIndex === currentQuestionIndex) return;
    
    const oldCard = document.getElementById(`card-${oldIndex}`);
    const newCard = document.getElementById(`card-${currentQuestionIndex}`);
    
    // Transition classes
    const exitClass = oldIndex < currentQuestionIndex ? 'exit-next' : 'exit-prev';
    
    oldCard.classList.remove('active');
    oldCard.classList.add(exitClass);
    
    newCard.classList.remove('exit-next', 'exit-prev');
    newCard.classList.add('active');
    
    // Adjust height
    adjustContainerHeight();
    
    // Cleanup old card after transition
    oldCard.addEventListener('transitionend', () => {
        oldCard.classList.remove(exitClass);
    }, { once: true });
    
    updateProgress();
    updateNavigation();
}

function adjustContainerHeight() {
    const activeCard = document.getElementById(`card-${currentQuestionIndex}`);
    if (activeCard) {
        // We enforce the container to match the active card's height + some padding if needed
        const height = activeCard.scrollHeight; 
        // Use scrollHeight to capture full content including padding
        elements.cardContainer.style.height = `${height}px`;
    }
}

function updateProgress() {
    const progress = (currentQuestionIndex / (quizData.length - 1)) * 100;
    elements.progressBar.style.width = `${progress}%`;
}

function updateNavigation() {
    const isAnswered = userAnswers[currentQuestionIndex] !== null;
    
    elements.nextBtn.disabled = !isAnswered;
    elements.finishBtn.disabled = !isAnswered;
    
    elements.prevBtn.classList.toggle('hidden', currentQuestionIndex === 0);
    
    const isLastQuestion = currentQuestionIndex === quizData.length - 1;
    elements.nextBtn.classList.toggle('hidden', isLastQuestion);
    elements.finishBtn.classList.toggle('hidden', !isLastQuestion);
}

function showResults() {
    let score = userAnswers.filter(a => a && a.isCorrect).length;
    
    // Hide UI
    elements.cardContainer.style.display = 'none';
    elements.navigation.style.display = 'none';
    elements.quizHeader.style.display = 'none';
    elements.resultsContainer.classList.remove('hidden');
    
    // Calculate Score
    const percentage = Math.round((score / quizData.length) * 100);
    
    // Determine subject dynamically from page title
    const title = document.title;
    const match = title.match(/^([A-Za-z]+)\s+(Quiz|Mastery)/i);
    let subject = "HTML";
    if (match && match[1]) {
        subject = match[1];
    }
    
    // Handle "a" vs "an" - "an HTML", "a Flutter", "a CSS", "a Dart"
    // H is a vowel sound in HTML (aitch)
    const article = (['A', 'E', 'I', 'O', 'U', 'H'].includes(subject[0].toUpperCase())) ? "an" : "a";

    let feedback = "Good effort! Every master was once a beginner.";
    if (percentage === 100) feedback = `Flawless Victory! You're ${article} ${subject} expert!`;
    else if (percentage >= 80) feedback = `Excellent work! You have a strong command of ${subject}.`;
    else if (percentage >= 60) feedback = "Well done! You have a solid foundation.";
    
    elements.resultsContainer.innerHTML = `
        <h2>Quiz Complete!</h2>
        <div class="score-circle">${percentage}%</div>
        <p style="font-size: 1.25rem; margin-bottom: 0.5rem; color: var(--text-primary);">You scored ${score} out of ${quizData.length}</p>
        <p style="font-size: 1rem; color: var(--text-secondary); margin-bottom: 2rem;">${feedback}</p>
        
        <div class="results-actions">
            <button class="nav-btn secondary" onclick="location.href='index.html'">Home</button>
            <button class="nav-btn" onclick="location.reload()">Try Again</button>
        </div>
    `;
    
    // Try to add Next Quiz button if applicable
    const addNextQuizButton = async () => {
        try {
            const path = window.location.pathname;
            const filename = path.substring(path.lastIndexOf('/') + 1);
            const match = filename.match(/^(.*?)quiz(\d+)\.html$/i);
            
            if (match && match[2]) {
                const prefix = match[1] || "";
                const currentQuizNum = parseInt(match[2], 10);
                const nextQuizNum = currentQuizNum + 1;
                const nextQuizUrl = `${prefix}quiz${nextQuizNum}.html`;
                
                // Verify if the next quiz exists
                try {
                    const response = await fetch(nextQuizUrl, { method: 'HEAD' });
                    if (response.ok) {
                        const nextQuizBtn = document.createElement('button');
                        nextQuizBtn.className = 'nav-btn';
                        nextQuizBtn.textContent = 'Next Quiz';
                        nextQuizBtn.onclick = () => location.href = nextQuizUrl;
                        elements.resultsContainer.querySelector('.results-actions').appendChild(nextQuizBtn);
                    }
                } catch (e) {
                    // For file:// URLs, fetch might throw - attempt a simple GET if HEAD fails
                    try {
                        const response = await fetch(nextQuizUrl);
                        if (response.ok) {
                            const nextQuizBtn = document.createElement('button');
                            nextQuizBtn.className = 'nav-btn';
                            nextQuizBtn.textContent = 'Next Quiz';
                            nextQuizBtn.onclick = () => location.href = nextQuizUrl;
                            elements.resultsContainer.querySelector('.results-actions').appendChild(nextQuizBtn);
                        }
                    } catch (err) {
                        console.log("Next quiz does not exist or cannot be reached.");
                    }
                }
            }
        } catch (e) {
            console.error("Error determining next quiz:", e);
        }
    };

    addNextQuizButton();

    // Dynamically add the Home button after the innerHTML is set
    const homeBtn = document.createElement('button');
    homeBtn.className = 'nav-btn secondary';
    // Determine dashboard based on quiz type
    const isFlutter = document.title.includes("Flutter");
    homeBtn.textContent = isFlutter ? 'Back to Flutter Hub' : 'Back to Web Hub';
    homeBtn.onclick = () => location.href = isFlutter ? 'flutter.html' : 'web.html';
    
    // Prepend the home button to the results-actions container
    const resultsActions = elements.resultsContainer.querySelector('.results-actions');
    if (resultsActions) {
        resultsActions.prepend(homeBtn);
    }
}

// Start
init();
