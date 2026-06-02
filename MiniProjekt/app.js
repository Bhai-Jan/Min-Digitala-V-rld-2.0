/**
 * Min Digitala Värld - Förenklad och rensad version
 */

let state = {
    posts: JSON.parse(localStorage.getItem('dagbok_inlagg')) || [],
    editingId: null,
    game: { playerScore: 0, computerScore: 0, streak: 0 },
    quiz: { 
        currentQuestion: 0, 
        points: parseInt(localStorage.getItem('quiz_points')) || 0, 
        questions: [],
        correctAnswers: 0,
        wrongAnswers: 0
    },
    shop: { products: [], cart: [], exchangeRate: 1 }
};

document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    setupDiary();
    setupGame();
    setupQuiz();
    setupShop();
    renderPosts();
    fetchWeather();
    fetchShopData();
});

function setupNavigation() {
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
            if (tab.dataset.tab === 'quiz' && state.quiz.questions.length === 0) fetchQuizQuestions();
        });
    });
}

function setupDiary() {
    const form = document.getElementById('diary-form');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('diary-title').value;
        const content = document.getElementById('diary-content').value;

        if (state.editingId) {
            const index = state.posts.findIndex(p => p.id === state.editingId);
            state.posts[index] = { ...state.posts[index], title, content };
            state.editingId = null;
        } else {
            state.posts.unshift({ id: Date.now().toString(), title: title || "Namnlöst", content, date: new Date().toLocaleString('sv-SE') });
        }
        localStorage.setItem('dagbok_inlagg', JSON.stringify(state.posts));
        form.reset();
        renderPosts();
        showNotification("Klart!");
    });
    document.getElementById('diary-search').addEventListener('input', (e) => renderPosts(e.target.value.toLowerCase()));
}

function renderPosts(filter = "") {
    const container = document.getElementById('diary-posts');
    const filtered = state.posts.filter(p => p.title.toLowerCase().includes(filter) || p.content.toLowerCase().includes(filter));
    container.innerHTML = filtered.map(post => `
        <div class="post-card">
            <div class="post-header">
                <div class="post-header-left">
                    <img src="https://api.dicebear.com/7.x/identicon/svg?seed=${post.id}" class="post-avatar">
                    <span class="post-title">${post.title}</span>
                </div>
                <span class="post-date">${post.date}</span>
            </div>
            <p>${post.content}</p>
            ${post.advice ? `<div class="advice-display">Tips: ${post.advice}</div>` : ''}
            <div class="post-footer">
                <button class="action-btn" onclick="editPost('${post.id}')">Redigera</button>
                <button class="action-btn delete" onclick="deletePost('${post.id}')">Ta bort</button>
            </div>
        </div>
    `).join('');
}

window.deletePost = (id) => { if (confirm("Ta bort?")) { state.posts = state.posts.filter(p => p.id !== id); localStorage.setItem('dagbok_inlagg', JSON.stringify(state.posts)); renderPosts(); } };
window.editPost = (id) => {
    const post = state.posts.find(p => p.id === id);
    document.getElementById('diary-title').value = post.title;
    document.getElementById('diary-content').value = post.content;
    state.editingId = id;
};

function setupGame() {
    const message = document.getElementById('game-message');
    const compDisplay = document.getElementById('computer-choice');
    const choiceBtns = document.querySelectorAll('.choice-btn');

    choiceBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const player = btn.dataset.choice;
            const options = ['sten', 'sax', 'påse'];
            const computer = options[Math.floor(Math.random() * 3)];
            
            // Inaktivera knappar under animation
            choiceBtns.forEach(b => b.disabled = true);
            
            // Starta animation
            message.innerText = "Robotens val...";
            message.style.color = "var(--text-main)";
            compDisplay.classList.add('anim-pulse');
            
            // Countdown-känsla
            const countdown = ["STEN...", "SAX...", "PÅSE..."];
            for (let text of countdown) {
                compDisplay.innerText = text;
                await new Promise(r => setTimeout(r, 500));
            }
            
            // Visa robotens val med animation
            compDisplay.classList.remove('anim-pulse');
            compDisplay.classList.add('anim-bounce');
            
            const emojiIcons = { sten: '🪨', sax: '✂️', påse: '📄' };
            compDisplay.innerText = emojiIcons[computer];
            
            // Ta bort animation-class efter en kort stund så den kan köras igen
            setTimeout(() => compDisplay.classList.remove('anim-bounce'), 500);
            
            if (player === computer) {
                message.innerText = "Oavgjort!";
                message.style.color = "var(--text-muted)";
                state.game.streak = 0;
            } else if ((player === 'sten' && computer === 'sax') || (player === 'sax' && computer === 'påse') || (player === 'påse' && computer === 'sten')) {
                message.innerText = "Du vann!";
                message.style.color = "var(--success)";
                state.game.playerScore++;
                state.game.streak++;
                const joke = await fetchJoke();
                message.innerHTML += `<div class="joke-display">${joke}</div>`;
            } else {
                message.innerText = "Datorn vann!";
                message.style.color = "var(--danger)";
                state.game.computerScore++;
                state.game.streak = 0;
                const advice = await fetchAdvice();
                message.innerHTML += `<div class="advice-display">${advice}</div>`;
            }
            
            document.getElementById('player-score').innerText = state.game.playerScore;
            document.getElementById('computer-score').innerText = state.game.computerScore;
            
            // Aktivera knappar igen
            choiceBtns.forEach(b => b.disabled = false);
        });
    });
    
    document.getElementById('reset-game').onclick = () => {
        state.game = { playerScore: 0, computerScore: 0, streak: 0 };
        document.getElementById('player-score').innerText = 0;
        document.getElementById('computer-score').innerText = 0;
        message.innerText = "Välj!";
        message.style.color = "white";
        compDisplay.innerText = "🤖";
        compDisplay.classList.remove('anim-pulse', 'anim-bounce');
        document.querySelectorAll('.choice-btn').forEach(b => b.disabled = false);
    };
}

async function fetchQuizQuestions() {
    try {
        const res = await fetch('https://opentdb.com/api.php?amount=10&type=multiple');
        const data = await res.json();
        const decode = (h) => { const t = document.createElement("textarea"); t.innerHTML = h; return t.value; };
        state.quiz.questions = data.results.map(q => ({
            q: decode(q.question),
            o: [...q.incorrect_answers.map(decode), decode(q.correct_answer)].sort(() => Math.random() - 0.5),
            a: decode(q.correct_answer)
        }));
    } catch (e) { console.log("Quiz error"); }
}

function setupQuiz() {
    document.getElementById('quiz-points').innerText = state.quiz.points;
    document.getElementById('start-quiz-btn').onclick = startQuiz;
    document.getElementById('restart-quiz-btn').onclick = startQuiz;
}

async function startQuiz() {
    // Om frågor inte har hämtats än, försök hämta dem nu
    if (state.quiz.questions.length === 0) {
        showNotification("Laddar frågor...", "info");
        await fetchQuizQuestions();
    }
    
    // Om det fortfarande inte finns några frågor (t.ex. vid nätverksfel)
    if (state.quiz.questions.length === 0) {
        showNotification("Kunde inte ladda frågor. Försök igen senare.", "error");
        return;
    }

    state.quiz.currentQuestion = 0;
    state.quiz.correctAnswers = 0;
    state.quiz.wrongAnswers = 0;
    state.quiz.points = 0; // Nollställ poäng vid start/omstart
    localStorage.setItem('quiz_points', 0); // Uppdatera localStorage
    document.getElementById('quiz-points').innerText = 0; // Uppdatera UI
    
    document.getElementById('quiz-start-screen').classList.add('hidden');
    document.getElementById('quiz-result-screen').classList.add('hidden');
    document.getElementById('quiz-game-screen').classList.remove('hidden');
    showQuestion();
}

function showQuestion() {
    const q = state.quiz.questions[state.quiz.currentQuestion];
    document.getElementById('quiz-question').innerText = q.q;
    
    const optionsContainer = document.getElementById('quiz-options');
    optionsContainer.innerHTML = ''; // Rensa gamla alternativ

    q.o.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'quiz-opt-btn';
        btn.innerText = opt;
        btn.onclick = () => window.checkAnswer(opt);
        optionsContainer.appendChild(btn);
    });
}

window.checkAnswer = (ans) => {
    if (ans === state.quiz.questions[state.quiz.currentQuestion].a) {
        state.quiz.points += 10;
        state.quiz.correctAnswers++;
        showNotification("Rätt!");
    } else {
        state.quiz.wrongAnswers++;
        showNotification("Fel!");
    }
    state.quiz.currentQuestion++;
    localStorage.setItem('quiz_points', state.quiz.points);
    document.getElementById('quiz-points').innerText = state.quiz.points;
    if (state.quiz.currentQuestion < state.quiz.questions.length) showQuestion();
    else { 
        document.getElementById('quiz-game-screen').classList.add('hidden'); 
        const resultScreen = document.getElementById('quiz-result-screen');
        resultScreen.classList.remove('hidden');
        document.getElementById('quiz-final-result').innerHTML = `
            <p>Du har svarat på alla frågor!</p>
            <div style="margin: 1rem 0; font-size: 1.2rem;">
                <span style="color: var(--success);">Rätt: ${state.quiz.correctAnswers}</span><br>
                <span style="color: var(--danger);">Fel: ${state.quiz.wrongAnswers}</span>
            </div>
            <p>Total poäng: ${state.quiz.points}</p>
        `;
    }
};

async function fetchShopData() {
    try {
        const [p, r] = await Promise.all([
            fetch('https://fakestoreapi.com/products'), 
            fetch('https://open.er-api.com/v6/latest/SEK')
        ]);
        state.shop.products = await p.json();
        const rateData = await r.json();
        state.shop.exchangeRate = rateData.rates.USD || 0.1; // Fallback om API:et strular
        renderProducts();
    } catch (e) { 
        console.log("Shop error:", e); 
        showNotification("Kunde inte hämta produkter", "error");
    }
}

function setupShop() {
    document.getElementById('open-cart-btn').onclick = () => document.getElementById('cart-modal').classList.remove('hidden');
    document.getElementById('close-cart-btn').onclick = () => document.getElementById('cart-modal').classList.add('hidden');
    
    // Slutför köp knapp
    document.getElementById('checkout-btn').onclick = () => {
        if (state.shop.cart.length === 0) {
            showNotification("Din varukorg är tom!", "error");
            return;
        }
        showNotification("Tack för ditt köp! Din beställning bearbetas.", "success");
        state.shop.cart = [];
        updateCart();
        document.getElementById('cart-modal').classList.add('hidden');
    };
}

function renderProducts() {
    const conversion = 1 / state.shop.exchangeRate;
    document.getElementById('product-list').innerHTML = state.shop.products.map(p => `
        <div class="product-card">
            <div class="product-image-container"><img src="${p.image}" class="product-image"></div>
            <span style="font-size: 0.8rem; height: 35px; overflow: hidden;">${p.title}</span>
            <span class="product-price">${Math.round(p.price * conversion)} kr</span>
            <button class="btn-primary" onclick="addToCart(${p.id})">Köp</button>
        </div>
    `).join('');
}

window.addToCart = (id) => {
    const product = state.shop.products.find(p => p.id === id);
    if (!product) {
        showNotification("Produkten hittades inte!", "error");
        return;
    }
    state.shop.cart.push(product);
    updateCart();
    showNotification("Lagd i vagnen!");
};

function updateCart() {
    document.getElementById('cart-count').innerText = state.shop.cart.length;
    const itemsDiv = document.getElementById('cart-items');
    
    if (state.shop.cart.length === 0) {
        itemsDiv.innerHTML = '<p style="text-align:center; padding: 2rem; color: var(--text-hand);">Varukorgen är tom</p>';
        document.getElementById('cart-total-price').innerText = '0';
        return;
    }

    const conversion = 1 / state.shop.exchangeRate;
    
    itemsDiv.innerHTML = state.shop.cart.map((item, i) => {
        const itemPrice = Math.round(item.price * conversion);
        return `
            <div class="cart-item">
                <img src="${item.image}" class="cart-item-img" alt="${item.title}">
                <div class="cart-item-info">
                    <span class="cart-item-name">${item.title}</span>
                    <span class="cart-item-price">${itemPrice} kr</span>
                </div>
                <button class="cart-remove-btn" onclick="removeFromCart(${i})" title="Ta bort">Ta bort</button>
            </div>
        `;
    }).join('');
    
    const total = state.shop.cart.reduce((s, it) => s + Math.round(it.price * conversion), 0);
    document.getElementById('cart-total-price').innerText = total;
}

window.removeFromCart = (i) => { state.shop.cart.splice(i, 1); updateCart(); };

async function fetchWeather() {
    try {
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=57.72&longitude=12.94&current_weather=true');
        const data = await res.json();
        document.getElementById('weather-widget').innerHTML = `Borås: ${Math.round(data.current_weather.temperature)}°C`;
    } catch (e) { }
}

async function fetchAdvice() { try { return (await (await fetch('https://api.adviceslip.com/advice')).json()).slip.advice; } catch (e) { return "Ta hand om dig."; } }
async function fetchJoke() { try { const d = await (await fetch('https://v2.jokeapi.dev/joke/Any?safe-mode')).json(); return d.type === 'single' ? d.joke : `${d.setup} ... ${d.delivery}`; } catch (e) { return "Varför gick kycklingen...?"; } }

function showNotification(m, type = "success") {
    const n = document.getElementById('notification');
    n.innerText = m;
    n.style.display = 'block';
    n.style.backgroundColor = type === "error" ? "var(--danger)" : "var(--accent)";
    setTimeout(() => n.style.display = 'none', 2000);
}