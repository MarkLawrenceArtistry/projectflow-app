import { supabase } from './supabaseClient.js';

const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const errorEl = document.getElementById('auth-error');

const showLoginLink = document.getElementById('show-login-link');
const showSignupLink = document.getElementById('show-signup-link');

showSignupLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.style.display = 'none';
    signupForm.style.display = 'block';
});

showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    signupForm.style.display = 'none';
    loginForm.style.display = 'block';
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.style.display = 'none';
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        errorEl.textContent = error.message;
        errorEl.style.display = 'block';
    } else {
        window.location.href = '/index.html';
    }
});

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.style.display = 'none';
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const name = document.getElementById('signup-name').value;

    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });

    if (authError) {
        errorEl.textContent = authError.message;
        errorEl.style.display = 'block';
        return;
    }

    // Create a profile for the new user
    const { error: profileError } = await supabase
        .from('profiles')
        .insert({ id: authData.user.id, name: name });

    if (profileError) {
        errorEl.textContent = "Error creating profile: " + profileError.message;
        errorEl.style.display = 'block';
    } else {
        window.location.href = '/index.html';
    }
});


// Redirect if already logged in
(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        window.location.href = '/index.html';
    }
})();