let translations = { en: {}, hi: {}, te: {}, ta: {}, kn: {}, ml: {}, mr: {} };

document.addEventListener('DOMContentLoaded', async () => {
    const languageSelect = document.getElementById('languageSelect');
    
    // Check if Supabase client is available
    if (typeof supabaseClient === 'undefined') {
        console.error('Supabase client is not loaded. Cannot fetch translations.');
        return;
    }

    try {
        // Fetch translations from database
        const { data, error } = await supabaseClient.from('translations').select('*');
        if (error) throw error;

        // Build translations object from DB data
        if (data && data.length > 0) {
            data.forEach(row => {
                const key = row.key_name;
                if (row.en) translations.en[key] = row.en;
                if (row.hi) translations.hi[key] = row.hi;
                if (row.te) translations.te[key] = row.te;
                if (row.ta) translations.ta[key] = row.ta;
                if (row.kn) translations.kn[key] = row.kn;
                if (row.ml) translations.ml[key] = row.ml;
                if (row.mr) translations.mr[key] = row.mr;
            });
        }
    } catch (err) {
        console.error('Error fetching translations:', err);
    }
    
    // Function to update the page text based on selected language
    function setLanguage(lang) {
        const textNodes = document.querySelectorAll('[data-i18n]');
        
        textNodes.forEach(node => {
            const key = node.getAttribute('data-i18n');
            if (translations[lang] && translations[lang][key]) {
                node.textContent = translations[lang][key];
            }
        });

        // Also update placeholders if data-i18n-placeholder exists
        const placeholderNodes = document.querySelectorAll('[data-i18n-placeholder]');
        placeholderNodes.forEach(node => {
            const key = node.getAttribute('data-i18n-placeholder');
            if (translations[lang] && translations[lang][key]) {
                node.setAttribute('placeholder', translations[lang][key]);
            }
        });
        
        // Save the selected language to local storage
        localStorage.setItem('preferredLanguage', lang);
    }
    
    // Event listener for language select change
    if (languageSelect) {
        languageSelect.addEventListener('change', (e) => {
            setLanguage(e.target.value);
        });
    }
    
    // Check local storage for previously selected language
    const savedLanguage = localStorage.getItem('preferredLanguage') || 'en';
    if (languageSelect) {
        languageSelect.value = savedLanguage;
    }
    setLanguage(savedLanguage);
});
