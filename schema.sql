-- Create a table for Dealers
CREATE TABLE public.dealers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    shop_name TEXT NOT NULL,
    category TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    gst_number TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    latitude NUMERIC,
    longitude NUMERIC,
    rating NUMERIC DEFAULT 0,
    business_hours TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.dealers ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own data
CREATE POLICY "Users can view own data" ON public.dealers
    FOR SELECT USING (auth.uid() = user_id);

-- Allow users to insert their own data
CREATE POLICY "Users can insert own data" ON public.dealers
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own data
CREATE POLICY "Users can update own data" ON public.dealers
    FOR UPDATE USING (auth.uid() = user_id);

-- Grant privileges so the API can access the table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dealers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dealers TO authenticated;

-- Create a table for Translations
CREATE TABLE public.translations (
    id SERIAL PRIMARY KEY,
    key_name TEXT UNIQUE NOT NULL,
    en TEXT,
    hi TEXT,
    te TEXT,
    ta TEXT,
    kn TEXT,
    ml TEXT,
    mr TEXT
);

-- -- Insert initial translations
INSERT INTO public.translations (key_name, en, hi, te, ta, kn, ml, mr) VALUES
('title', 'Select Your Role', 'अपनी भूमिका चुनें', 'మీ పాత్రను ఎంచుకోండి', 'உங்கள் பங்கைத் தேர்ந்தெடுக்கவும்', 'ನಿಮ್ಮ ಪಾತ್ರವನ್ನು ಆಯ್ಕೆಮಾಡಿ', 'നിങ്ങളുടെ പങ്ക് തിരഞ്ഞെടുക്കുക', 'तुमची भूमिका निवडा'),
('subtitle', 'Choose your designated portal to continue', 'आगे बढ़ने के लिए अपना निर्दिष्ट पोर्टल चुनें', 'కొనసాగడానికి మీ పోర్టల్‌ను ఎంచుకోండి', 'தொடர உங்கள் போர்ட்டலைத் தேர்ந்தெடுக்கவும்', 'ಮುಂದುವರಿಯಲು ನಿಮ್ಮ ಪೋರ್ಟಲ್ ಅನ್ನು ಆಯ್ಕೆಮಾಡಿ', 'തുടരുന്നതിന് നിങ്ങളുടെ പോർട്ടൽ തിരഞ്ഞെടുക്കുക', 'पुढे जाण्यासाठी तुमचे पोर्टल निवडा'),
('dealerTitle', 'Dealer', 'डीलर (Dealer)', 'డీలర్', 'டீலர் (Dealer)', 'ಡೀಲರ್ (Dealer)', 'ഡീലർ (Dealer)', 'डीलर (Dealer)'),
('dealerDesc', 'Manage your distribution network, track bulk orders, and analyze regional sales analytics.', 'अपने वितरण नेटवर्क का प्रबंधन करें, थोक आदेशों को ट्रैक करें और क्षेत्रीय बिक्री का विश्लेषण करें।', 'మీ పంపిణీ నెట్‌వర్క్‌ను నిర్వహించండి, బల్క్ ఆర్డర్‌లను ట్రాక్ చేయండి మరియు ప్రాంతీయ విక్రయాలను విశ్లేషించండి.', 'உங்கள் விநியோக நெட்வொர்க்கை நிர்வகிக்கவும், மொத்த ஆர்டர்களைக் கண்காணிக்கவும் மற்றும் பிராந்திய விற்பனையை பகுப்பாய்வு செய்யவும்.', 'ನಿಮ್ಮ ವಿತರಣಾ ನೆಟ್‌ವರ್ಕ್ ಅನ್ನು ನಿರ್ವಹಿಸಿ, ಬೃಹತ್ ಆದೇಶಗಳನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ ಮತ್ತು ಪ್ರಾದೇಶಿಕ ಮಾರಾಟವನ್ನು ವಿಶ್ಲೇಷಿಸಿ.', 'നിങ്ങളുടെ വിതരണ ശൃംഖല നിയന്ത്രിക്കുക, ബൾക്ക് ഓർഡറുകൾ ട്രാക്ക് ചെയ്യുക, പ്രാദേശിക വിൽപ്പന വിശകലനം ചെയ്യുക.', 'तुमचे वितरण नेटवर्क व्यवस्थापित करा, घाऊक ऑर्डर ट्रॅक करा आणि प्रादेशिक विक्रीचे विश्लेषण करा.'),
('dealerBtn', 'Login as Dealer', 'डीलर के रूप में लॉगिन करें', 'డీలర్‌గా లాగిన్ అవ్వండి', 'டீலராக உள்நுழையவும்', 'ಡೀಲರ್ ಆಗಿ ಲಾಗಿನ್ ಮಾಡಿ', 'ഡീലറായി ലോഗിൻ ചെയ്യുക', 'डीलर म्हणून लॉग इन करा'),
('shopkeeperTitle', 'Shopkeeper', 'दुकानदार (Shopkeeper)', 'దుకాణదారుడు', 'கடைக்காரர் (Shopkeeper)', 'ಅಂಗಡಿಯವನು (Shopkeeper)', 'കടയുടമ (Shopkeeper)', 'दुकानदार (Shopkeeper)'),
('shopkeeperDesc', 'Manage your local inventory, track daily retail sales, and easily re-stock from dealers.', 'अपनी स्थानीय इन्वेंट्री का प्रबंधन करें, दैनिक बिक्री को ट्रैक करें और डीलरों से आसानी से पुनः स्टॉक करें।', 'మీ స్థానిక ఇన్వెంటరీని నిర్వహించండి, రోజువారీ విక్రయాలను ట్రాక్ చేయండి మరియు డీలర్ల నుండి సులభంగా రీ-స్టాక్ చేయండి.', 'உங்கள் உள்ளூர் சரக்குகளை நிர்வகிக்கவும், தினசரி விற்பனையைக் கண்காணிக்கவும், டீலர்களிடமிருந்து எளிதாக மீண்டும் சேமிக்கவும்.', 'ನಿಮ್ಮ ಸ್ಥಳೀಯ ದಾಸ್ತಾನು ನಿರ್ವಹಿಸಿ, ದೈನಂದಿನ ಮಾರಾಟವನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ ಮತ್ತು ವಿತರಕರಿಂದ ಸುಲಭವಾಗಿ ಮರು-ಸ್ಟಾಕ್ ಮಾಡಿ.', 'നിങ്ങളുടെ പ്രാദേശിക ഇൻവെന്ററി നിയന്ത്രിക്കുക, ദൈനംദിന വിൽപ്പന ട്രാക്ക് ചെയ്യുക, ഡീലർമാരിൽ നിന്ന് എളുപ്പത്തിൽ റീസ്റ്റോക്ക് ചെയ്യുക.', 'तुमची स्थानिक इन्व्हेंटरी व्यवस्थापित करा, दैनंदिन विक्री ट्रॅक करा आणि डीलर्सकडून सहजपणे रि-स्टॉक करा.'),
('shopkeeperBtn', 'Login as Shopkeeper', 'दुकानदार के रूप में लॉगिन करें', 'దుకాణదారుడిగా లాగిన్ అవ్వండి', 'கடைக்காரராக உள்நுழையவும்', 'ಅಂಗಡಿಯವನಾಗಿ ಲಾಗಿನ್ ಮಾಡಿ', 'കടയുടമയായി ലോഗിൻ ചെയ്യുക', 'दुकानदार म्हणून लॉग इन करा'),
('customerTitle', 'Customer', 'ग्राहक (Customer)', 'వినియోగదారుడు', 'வாடிக்கையாளர் (Customer)', 'ಗ್ರಾಹಕ (Customer)', 'ഉപഭോക്താവ് (Customer)', 'ग्राहक (Customer)'),
('customerDesc', 'Browse products, find local shops, compare prices and make purchases seamlessly.', 'उत्पादों को ब्राउज़ करें, स्थानीय दुकानें खोजें, कीमतों की तुलना करें और आसानी से खरीदारी करें।', 'ఉత్పత్తులను బ్రౌజ్ చేయండి, స్థానిక దుకాణాలను కనుగొనండి, ధరలను సరిపోల్చండి మరియు సులభంగా కొనుగోలు చేయండి.', 'தயாரிப்புகளை உலாவவும், உள்ளூர் கடைகளைக் கண்டறியவும், விலைகளை ஒப்பிடவும் மற்றும் எளிதாக வாங்கவும்.', 'ಉತ್ಪನ್ನಗಳನ್ನು ಬ್ರೌಸ್ ಮಾಡಿ, ಸ್ಥಳೀಯ ಅಂಗಡಿಗಳನ್ನು ಹುಡುಕಿ, ಬೆಲೆಗಳನ್ನು ಹೋಲಿಕೆ ಮಾಡಿ ಮತ್ತು ಸುಲಭವಾಗಿ ಖರೀದಿಸಿ.', 'ഉൽപ്പന്നങ്ങൾ ബ്രൗസ് ചെയ്യുക, പ്രാദേശിക കടകൾ കണ്ടെത്തുക, വിലകൾ താരതമ്യം ചെയ്യുക, എളുപ്പത്തിൽ വാങ്ങുക.', 'उत्पादने ब्राउझ करा, स्थानिक दुकाने शोधा, किमतींची तुलना करा आणि सहज खरेदी करा.'),
('customerBtn', 'Login as Customer', 'ग्राहक के रूप में लॉगिन करें', 'వినియోగదారుడిగా లాగిన్ అవ్వండి', 'வாடிக்கையாளராக உள்நுழையவும்', 'ಗ್ರಾಹಕನಾಗಿ ಲಾಗಿನ್ ಮಾಡಿ', 'ഉപഭോക്താവായി ലോഗിൻ ചെയ്യുക', 'ग्राहक म्हणून लॉग इन करा'),
('authLoginTab', 'Login', 'लॉगिन', 'లాగిన్', 'உள்நுழைய', 'ಲಾಗಿನ್', 'ലോഗിൻ', 'लॉगिन'),
('authSignupTab', 'Sign Up', 'साइन अप', 'సైన్ అప్', 'பதிவு செய்ய', 'ಸೈನ್ ಅಪ್', 'സൈൻ അപ്പ്', 'साइन अप'),
('loginTitle', 'Dealer Login', 'डीलर लॉगिन', 'డీలర్ లాగిన్', 'டீலர் உள்நுழைவு', 'ಡೀಲರ್ ಲಾಗಿನ್', 'ഡീലർ ലോഗിൻ', 'डीलर लॉगिन'),
('mobileLabel', 'Mobile Number *', 'मोबाइल नंबर *', 'మొబైల్ నంబర్ *', 'மொபைல் எண் *', 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ *', 'മൊബൈൽ നമ്പർ *', 'मोबाईल नंबर *'),
('mobilePlaceholder', 'Enter your mobile number', 'अपना मोबाइल नंबर दर्ज करें', 'మీ మొబైల్ నంబర్‌ను నమోదు చేయండి', 'உங்கள் மொபைல் எண்ணை உள்ளிடவும்', 'ನಿಮ್ಮ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ', 'നിങ്ങളുടെ മൊബൈൽ നമ്പർ നൽകുക', 'तुमचा मोबाईल नंबर टाका'),
('passwordLabel', 'Password *', 'पासवर्ड *', 'పాస్‌వర్డ్ *', 'கடவுச்சொல் *', 'ಪಾಸ್‌ವರ್ಡ್ *', 'പാസ്‌വേഡ് *', 'पासवर्ड *'),
('passwordPlaceholder', 'Enter your password', 'अपना पासवर्ड दर्ज करें', 'మీ పాస్‌వర్డ్‌ను నమోదు చేయండి', 'உங்கள் கடவுச்சொல்லை உள்ளிடவும்', 'ನಿಮ್ಮ ಪಾಸ್‌ವರ್ಡ್ ನಮೂದಿಸಿ', 'നിങ്ങളുടെ പാസ്‌വേഡ് നൽകുക', 'तुमचा पासवर्ड टाका'),
('loginBtn', 'Login', 'लॉगिन', 'లాగిన్', 'உள்நுழைய', 'ಲಾಗಿನ್', 'ലോഗിൻ', 'लॉगिन'),
('backLink', '← Back to Role Selection', '← भूमिका चयन पर वापस जाएं', '← పాత్ర ఎంపికకు తిరిగి వెళ్ళండి', '← பங்கு தேர்வுக்கு திரும்புக', '← ಪಾತ್ರದ ಆಯ್ಕೆಗೆ ಹಿಂತಿರುಗಿ', '← റോൾ തിരഞ്ഞെടുപ്പിലേക്ക് മടങ്ങുക', '← भूमिका निवडीवर परत जा'),
('signupTitle', 'Dealer Registration', 'डीलर पंजीकरण', 'డీలర్ నమోదు', 'டீலர் பதிவு', 'ಡೀಲರ್ ನೋಂದಣಿ', 'ഡീലർ രജിസ്ട്രേഷൻ', 'डीलर नोंदणी'),
('nameLabel', 'Full Name *', 'पूरा नाम *', 'పూర్తి పేరు *', 'முழு பெயர் *', 'ಪೂರ್ಣ ಹೆಸರು *', 'പൂർണ്ണ നാമം *', 'पूर्ण नाव *'),
('namePlaceholder', 'Enter full name', 'पूरा नाम दर्ज करें', 'పూర్తి పేరు నమోదు చేయండి', 'முழு பெயரை உள்ளிடவும்', 'ಪೂರ್ಣ ಹೆಸರನ್ನು ನಮೂದಿಸಿ', 'പൂർണ്ണ നാമം നൽകുക', 'पूर्ण नाव टाका'),
('shopLabel', 'Shop Name *', 'दुकान का नाम *', 'దుకాణం పేరు *', 'கடையின் பெயர் *', 'ಅಂಗಡಿಯ ಹೆಸರು *', 'കടയുടെ പേര് *', 'दुकानाचे नाव *'),
('shopPlaceholder', 'Enter shop name', 'दुकान का नाम दर्ज करें', 'దుకాణం పేరు నమోదు చేయండి', 'கடையின் பெயரை உள்ளிடவும்', 'ಅಂಗಡಿಯ ಹೆಸರನ್ನು ನಮೂದಿಸಿ', 'കടയുടെ പേര് നൽകുക', 'दुकानाचे नाव टाका'),
('categoryLabel', 'Business Category *', 'व्यापार श्रेणी *', 'వ్యాపార వర్గం *', 'வணிக வகை *', 'ವ್ಯಾಪಾರ ವರ್ಗ *', 'ബിസിനസ്സ് വിഭാഗം *', 'व्यवसाय श्रेणी *'),
('catDefault', 'Select Category', 'श्रेणी चुनें', 'వర్గాన్ని ఎంచుకోండి', 'வகையைத் தேர்ந்தெடுக்கவும்', 'ವರ್ಗವನ್ನು ಆಯ್ಕೆಮಾಡಿ', 'വിഭാഗം തിരഞ്ഞെടുക്കുക', 'श्रेणी निवडा'),
('catElectronics', 'Electronics', 'इलेक्ट्रॉनिक्स', 'ఎలక్ట్రానిక్స్', 'மின்னணுவியல்', 'ಎಲೆಕ್ಟ್ರಾನಿಕ್ಸ್', 'ഇലക്ട്രോണിക്സ്', 'इलेक्ट्रॉनिक्स'),
('catGrocery', 'Grocery & FMCG', 'किराना और एफएमसीजी', 'కిరాణా & FMCG', 'மளிகை மற்றும் FMCG', 'ಕಿರಾಣಿ ಮತ್ತು ಎಫ್‌ಎಂಸಿಜಿ', 'പലചരക്ക് & എഫ്എംസിജി', 'किराणा आणि एफएमसीजी'),
('catClothing', 'Clothing & Apparel', 'कपड़े और परिधान', 'దుస్తులు & అపారెల్', 'ஆடைகள்', 'ಬಟ್ಟೆ', 'വസ്ത്രങ്ങൾ', 'कपडे'),
('catHardware', 'Hardware', 'हार्डवेयर', 'హార్డ్‌వేర్', 'வன்பொருள்', 'ಹಾರ್ಡ್‌ವೇರ್', 'ഹാർഡ്‌വെയർ', 'हार्डवेअर'),
('catOther', 'Other', 'अन्य', 'ఇतर', 'மற்றவை', 'ಇತರೆ', 'മറ്റുള്ളവ', 'इतर'),
('gstLabel', 'GST Number', 'जीएसटी नंबर', 'GST నంబర్', 'ஜிஎஸ்டி எண்', 'ಜಿಎಸ್ಟಿ ಸಂಖ್ಯೆ', 'ജിഎസ്ടി നമ്പർ', 'जीएसटी नंबर'),
('gstPlaceholder', 'Enter GST Number', 'जीएसटी नंबर दर्ज करें', 'GST నంబర్‌ను నమోదు చేయండి', 'ஜிஎஸ்டி எண்ணை உள்ளிடவும்', 'ಜಿಎಸ್ಟಿ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ', 'ജിഎസ്ടി നമ്പർ നൽകുക', 'जीएसटी नंबर टाका'),
('gstVerifyBtn', 'Verify', 'सत्यापित करें', 'ధృవీకరించండి', 'சரிபார்க்கவும்', 'ಪರಿಶೀಲಿಸಿ', 'സ്ഥിരീകരിക്കുക', 'पडताळणी करा'),
('signupPassPlaceholder', 'Create a password', 'पासवर्ड बनाएं', 'పాస్‌వర్డ్ సృష్టించండి', 'கடவுச்சொல்லை உருவாக்கவும்', 'ಪಾಸ್‌ವರ್ಡ್ ರಚಿಸಿ', 'ഒരു പാസ്‌വേഡ് സൃഷ്ടിക്കുക', 'पासवर्ड तयार करा'),
('locDetailsTitle', 'Location Details', 'स्थान का विवरण', 'స్థాన వివరాలు', 'இட விவரங்கள்', 'ಸ್ಥಳದ ವಿವರಗಳು', 'ലൊക്കേഷൻ വിശദാംശങ്ങൾ', 'स्थानाचा तपशील'),
('btnLocation', 'Use My Current Location 📍', 'मेरे वर्तमान स्थान का उपयोग करें 📍', 'నా ప్రస్తుత స్థానాన్ని ఉపయోగించండి 📍', 'எனது தற்போதைய இருப்பிடத்தைப் பயன்படுத்தவும் 📍', 'ನನ್ನ ಪ್ರಸ್ತುತ ಸ್ಥಳವನ್ನು ಬಳಸಿ 📍', 'എന്റെ നിലവിലെ ലൊക്കേഷൻ ഉപയോഗിക്കുക 📍', 'माझे वर्तमान स्थान वापरा 📍'),
('addressLabel', 'Shop Address *', 'दुकान का पता *', 'దుకాణం చిరునామా *', 'கடையின் முகவரி *', 'ಅಂಗಡಿಯ ವಿಳಾಸ *', 'കടയുടെ വിലാസം *', 'दुकानाचा पत्ता *'),
('addressPlaceholder', 'Enter full shop address', 'दुकान का पूरा पता दर्ज करें', 'పూర్తి దుకాణం చిరునామాను నమోదు చేయండి', 'முழு கடை முகவரியை உள்ளிடவும்', 'ಪೂರ್ಣ ಅಂಗಡಿಯ ವಿಳಾಸವನ್ನು ನಮೂದಿಸಿ', 'മുഴുവൻ കടയുടെ വിലാസം നൽകുക', 'दुकानाचा पूर्ण पत्ता टाका'),
('cityLabel', 'City *', 'शहर *', 'నగరం *', 'நகரம் *', 'ನಗರ *', 'നഗരം *', 'शहर *'),
('cityPlaceholder', 'City', 'शहर', 'నగరం', 'நகரம்', 'ನಗರ', 'നഗരം', 'शहर'),
('stateLabel', 'State *', 'राज्य *', 'రాష్ట్రం *', 'மாநிலம் *', 'ರಾಜ್ಯ *', 'സംസ്ഥാനം *', 'राज्य *'),
('statePlaceholder', 'State', 'राज्य', 'రాష్ట్రం', 'மாநிலம்', 'ರಾಜ್ಯ', 'സംസ്ഥാനം', 'राज्य'),
('pincodeLabel', 'Pincode *', 'पिनकोड *', 'పిన్‌కోడ్ *', 'பின்கோடு *', 'ಪಿನ್‌ಕೋಡ್ *', 'പിൻകോഡ് *', 'पिनकोड *'),
('pincodePlaceholder', 'Pincode', 'पिनकोड', 'పిన్‌కోడ్', 'பின்கோடு', 'ಪಿನ್‌ಕೋಡ್', 'പിൻകോഡ്', 'पिनकोड'),
('signupBtn', 'Create Dealer Account', 'डीलर खाता बनाएं', 'డీలర్ ఖాతాను సృష్టించండి', 'டீலர் கணக்கை உருவாக்கவும்', 'ಡೀಲರ್ ಖಾತೆಯನ್ನು ರಚಿಸಿ', 'ഡീലർ അക്കൗണ്ട് സൃഷ്ടിക്കുക', 'डीलर खाते तयार करा')
ON CONFLICT (key_name) DO UPDATE SET 
en = EXCLUDED.en, hi = EXCLUDED.hi, te = EXCLUDED.te, 
ta = EXCLUDED.ta, kn = EXCLUDED.kn, ml = EXCLUDED.ml, mr = EXCLUDED.mr;

-- Enable Row Level Security (RLS) on translations
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;

-- Allow public read access to translations (anyone can view translations)
CREATE POLICY "Public can view translations" ON public.translations
    FOR SELECT USING (true);

-- Grant privileges so the API can read the table
GRANT SELECT ON public.translations TO anon;
GRANT SELECT ON public.translations TO authenticated;*'),
('catDefault', 'Select Category', 'श्रेणी चुनें', 'వర్గాన్ని ఎంచుకోండి', 'வகையைத் தேர்ந்தெடுக்கவும்', 'ವರ್ಗವನ್ನು ಆಯ್ಕೆಮಾಡಿ', 'വിഭാഗം തിരഞ്ഞെടുക്കുക', 'श्रेणी निवडा'),
('catElectronics', 'Electronics', 'इलेक्ट्रॉनिक्स', 'ఎలక్ట్రానిక్స్', 'மின்னணுவியல்', 'ಎಲೆಕ್ಟ್ರಾನಿಕ್ಸ್', 'ഇലക്ട്രോണിക്സ്', 'इलेक्ट्रॉनिक्स'),
('catGrocery', 'Grocery & FMCG', 'किराना और एफएमसीजी', 'కిరాణా & FMCG', 'மளிகை மற்றும் FMCG', 'ಕಿರಾಣಿ ಮತ್ತು ಎಫ್‌ಎಂಸಿಜಿ', 'പലചരക്ക് & എഫ്എംസിജി', 'किराणा आणि एफएमसीजी'),
('catClothing', 'Clothing & Apparel', 'कपड़े और परिधान', 'దుస్తులు & అపారెల్', 'ஆடைகள்', 'ಬಟ್ಟೆ', 'വസ്ത്രങ്ങൾ', 'कपडे'),
('catHardware', 'Hardware', 'हार्डवेयर', 'హార్డ్‌వేర్', 'வன்பொருள்', 'ಹಾರ್ಡ್‌ವೇರ್', 'ഹാർഡ്‌വെയർ', 'हार्डवेअर'),
('catOther', 'Other', 'अन्य', 'ఇతర', 'மற்றவை', 'ಇತರೆ', 'മറ്റുള്ളവ', 'इतर'),
('gstLabel', 'GST Number', 'जीएसटी नंबर', 'GST నంబర్', 'ஜிஎஸ்டி எண்', 'ಜಿಎಸ್ಟಿ ಸಂಖ್ಯೆ', 'ജിഎസ്ടി നമ്പർ', 'जीएसटी नंबर'),
('gstPlaceholder', 'Enter GST Number', 'जीएसटी नंबर दर्ज करें', 'GST నంబర్‌ను నమోదు చేయండి', 'ஜிஎஸ்டி எண்ணை உள்ளிடவும்', 'ಜಿಎಸ್ಟಿ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ', 'ജിഎസ്ടി നമ്പർ നൽകുക', 'जीएसटी नंबर टाका'),
('gstVerifyBtn', 'Verify', 'सत्यापित करें', 'ధృవీకరించండి', 'சரிபார்க்கவும்', 'ಪರಿಶೀಲಿಸಿ', 'സ്ഥിരീകരിക്കുക', 'पडताळणी करा'),
('signupPassPlaceholder', 'Create a password', 'पासवर्ड बनाएं', 'పాస్‌వర్డ్ సృష్టించండి', 'கடவுச்சொல்லை உருவாக்கவும்', 'ಪಾಸ್‌ವರ್ಡ್ ರಚಿಸಿ', 'ഒരു പാസ്‌വേഡ് സൃഷ്ടിക്കുക', 'पासवर्ड तयार करा'),
('locDetailsTitle', 'Location Details', 'स्थान का विवरण', 'స్థాన వివరాలు', 'இட விவரங்கள்', 'ಸ್ಥಳದ ವಿವರಗಳು', 'ലൊക്കേഷൻ വിശദാംശങ്ങൾ', 'स्थानाचा तपशील'),
('btnLocation', 'Use My Current Location 📍', 'मेरे वर्तमान स्थान का उपयोग करें 📍', 'నా ప్రస్తుత స్థానాన్ని ఉపయోగించండి 📍', 'எனது தற்போதைய இருப்பிடத்தைப் பயன்படுத்தவும் 📍', 'ನನ್ನ ಪ್ರಸ್ತುತ ಸ್ಥಳವನ್ನು ಬಳಸಿ 📍', 'എന്റെ നിലവിലെ ലൊക്കേഷൻ ഉപയോഗിക്കുക 📍', 'माझे वर्तमान स्थान वापरा 📍'),
('addressLabel', 'Shop Address *', 'दुकान का पता *', 'దుకాణం చిరునామా *', 'கடையின் முகவரி *', 'ಅಂಗಡಿಯ ವಿಳಾಸ *', 'കടയുടെ വിലാസം *', 'दुकानाचा पत्ता *'),
('addressPlaceholder', 'Enter full shop address', 'दुकान का पूरा पता दर्ज करें', 'పూర్తి దుకాణం చిరునామాను నమోదు చేయండి', 'முழு கடை முகவரியை உள்ளிடவும்', 'ಪೂರ್ಣ ಅಂಗಡಿಯ ವಿಳಾಸವನ್ನು ನಮೂದಿಸಿ', 'മുഴുവൻ കടയുടെ വിലാസം നൽകുക', 'दुकानाचा पूर्ण पत्ता टाका'),
('cityLabel', 'City *', 'शहर *', 'నగరం *', 'நகரம் *', 'ನಗರ *', 'നഗരം *', 'शहर *'),
('cityPlaceholder', 'City', 'शहर', 'నగరం', 'நகரம்', 'ನಗರ', 'നഗരം', 'शहर'),
('stateLabel', 'State *', 'राज्य *', 'రాష్ట్రం *', 'மாநிலம் *', 'ರಾಜ್ಯ *', 'സംസ്ഥാനം *', 'राज्य *'),
('statePlaceholder', 'State', 'राज्य', 'రాష్ట్రం', 'மாநிலம்', 'ರಾಜ್ಯ', 'സംസ്ഥാനം', 'राज्य'),
('pincodeLabel', 'Pincode *', 'पिनकोड *', 'పిన్‌కోడ్ *', 'பின்கோடு *', 'ಪಿನ್‌ಕೋಡ್ *', 'പിൻകോഡ് *', 'पिनकोड *'),
('pincodePlaceholder', 'Pincode', 'पिनकोड', 'పిన్‌కోడ్', 'பின்கோடு', 'ಪಿನ್‌ಕೋಡ್', 'പിൻകോഡ്', 'पिनकोड'),
('signupBtn', 'Create Dealer Account', 'डीलर खाता बनाएं', 'డీలర్ ఖాతాను సృష్టించండి', 'டீலர் கணக்கை உருவாக்கவும்', 'ಡೀಲರ್ ಖಾತೆಯನ್ನು ರಚಿಸಿ', 'ഡീലർ അക്കൗണ്ട് സൃഷ്ടിക്കുക', 'डीलर खाते तयार करा')
ON CONFLICT (key_name) DO UPDATE SET 
en = EXCLUDED.en, hi = EXCLUDED.hi, te = EXCLUDED.te, 
ta = EXCLUDED.ta, kn = EXCLUDED.kn, ml = EXCLUDED.ml, mr = EXCLUDED.mr; బ్రౌజ్ చేయండి, స్థానిక దుకాణాలను కనుగొనండి, ధరలను సరిపోల్చండి మరియు సులభంగా కొనుగోలు చేయండి.', 'தயாரிப்புகளை உலாவவும், உள்ளூர் கடைகளைக் கண்டறியவும், விலைகளை ஒப்பிடவும் மற்றும் எளிதாக வாங்கவும்.', 'ಉತ್ಪನ್ನಗಳನ್ನು ಬ್ರೌಸ್ ಮಾಡಿ, ಸ್ಥಳೀಯ ಅಂಗಡಿಗಳನ್ನು ಹುಡುಕಿ, ಬೆಲೆಗಳನ್ನು ಹೋಲಿಕೆ ಮಾಡಿ ಮತ್ತು ಸುಲಭವಾಗಿ ಖರೀದಿಸಿ.', 'ഉൽപ്പന്നങ്ങൾ ബ്രൗസ് ചെയ്യുക, പ്രാദേശിക കടകൾ കണ്ടെത്തുക, വിലകൾ താരതമ്യം ചെയ്യുക, എളുപ്പത്തിൽ വാങ്ങുക.', 'उत्पादने ब्राउझ करा, स्थानिक दुकाने शोधा, किमतींची तुलना करा आणि सहज खरेदी करा.'),
('customerBtn', 'Login as Customer', 'ग्राहक के रूप में लॉगिन करें', 'వినియోగదారుడిగా లాగిన్ అవ్వండి', 'வாடிக்கையாளராக உள்நுழையவும்', 'ಗ್ರಾಹಕನಾಗಿ ಲಾಗಿನ್ ಮಾಡಿ', 'ഉപഭോക്താവായി ലോഗിൻ ചെയ്യുക', 'ग्राहक म्हणून लॉग इन करा'),
('authLoginTab', 'Login', NULL, 'లాగిన్', NULL, NULL, NULL, NULL),
('authSignupTab', 'Sign Up', NULL, 'సైన్ అప్', NULL, NULL, NULL, NULL),
('loginTitle', 'Dealer Login', NULL, 'డీలర్ లాగిన్', NULL, NULL, NULL, NULL),
('mobileLabel', 'Mobile Number *', NULL, 'మొబైల్ నంబర్ *', NULL, NULL, NULL, NULL),
('mobilePlaceholder', 'Enter your mobile number', NULL, 'మీ మొబైల్ నంబర్‌ను నమోదు చేయండి', NULL, NULL, NULL, NULL),
('passwordLabel', 'Password *', NULL, 'పాస్‌వర్డ్ *', NULL, NULL, NULL, NULL),
('passwordPlaceholder', 'Enter your password', NULL, 'మీ పాస్‌వర్డ్‌ను నమోదు చేయండి', NULL, NULL, NULL, NULL),
('loginBtn', 'Login', NULL, 'లాగిన్', NULL, NULL, NULL, NULL),
('backLink', '← Back to Role Selection', NULL, '← పాత్ర ఎంపికకు తిరిగి వెళ్ళండి', NULL, NULL, NULL, NULL),
('signupTitle', 'Dealer Registration', NULL, 'డీలర్ నమోదు', NULL, NULL, NULL, NULL),
('nameLabel', 'Full Name *', NULL, 'పూర్తి పేరు *', NULL, NULL, NULL, NULL),
('namePlaceholder', 'Enter full name', NULL, 'పూర్తి పేరు నమోదు చేయండి', NULL, NULL, NULL, NULL),
('shopLabel', 'Shop Name *', NULL, 'దుకాణం పేరు *', NULL, NULL, NULL, NULL),
('shopPlaceholder', 'Enter shop name', NULL, 'దుకాణం పేరు నమోదు చేయండి', NULL, NULL, NULL, NULL),
('categoryLabel', 'Business Category *', NULL, 'వ్యాపార వర్గం *', NULL, NULL, NULL, NULL),
('catDefault', 'Select Category', NULL, 'వర్గాన్ని ఎంచుకోండి', NULL, NULL, NULL, NULL),
('catElectronics', 'Electronics', NULL, 'ఎలక్ట్రానిక్స్', NULL, NULL, NULL, NULL),
('catGrocery', 'Grocery & FMCG', NULL, 'కిరాణా & FMCG', NULL, NULL, NULL, NULL),
('catClothing', 'Clothing & Apparel', NULL, 'దుస్తులు & అపారెల్', NULL, NULL, NULL, NULL),
('catHardware', 'Hardware', NULL, 'హార్డ్‌వేర్', NULL, NULL, NULL, NULL),
('catOther', 'Other', NULL, 'ఇతర', NULL, NULL, NULL, NULL),
('gstLabel', 'GST Number', NULL, 'GST నంబర్', NULL, NULL, NULL, NULL),
('gstPlaceholder', 'Enter GST Number', NULL, 'GST నంబర్‌ను నమోదు చేయండి', NULL, NULL, NULL, NULL),
('gstVerifyBtn', 'Verify', NULL, 'ధృవీకరించండి', NULL, NULL, NULL, NULL),
('signupPassPlaceholder', 'Create a password', NULL, 'పాస్‌వర్డ్ సృష్టించండి', NULL, NULL, NULL, NULL),
('locDetailsTitle', 'Location Details', NULL, 'స్థాన వివరాలు', NULL, NULL, NULL, NULL),
('btnLocation', 'Use My Current Location 📍', NULL, 'నా ప్రస్తుత స్థానాన్ని ఉపయోగించండి 📍', NULL, NULL, NULL, NULL),
('addressLabel', 'Shop Address *', NULL, 'దుకాణం చిరునామా *', NULL, NULL, NULL, NULL),
('addressPlaceholder', 'Enter full shop address', NULL, 'పూర్తి దుకాణం చిరునామాను నమోదు చేయండి', NULL, NULL, NULL, NULL),
('cityLabel', 'City *', NULL, 'నగరం *', NULL, NULL, NULL, NULL),
('cityPlaceholder', 'City', NULL, 'నగరం', NULL, NULL, NULL, NULL),
('stateLabel', 'State *', NULL, 'రాష్ట్రం *', NULL, NULL, NULL, NULL),
('statePlaceholder', 'State', NULL, 'రాష్ట్రం', NULL, NULL, NULL, NULL),
('pincodeLabel', 'Pincode *', NULL, 'పిన్‌కోడ్ *', NULL, NULL, NULL, NULL),
('pincodePlaceholder', 'Pincode', NULL, 'పిన్‌కోడ్', NULL, NULL, NULL, NULL),
('signupBtn', 'Create Dealer Account', NULL, 'డీలర్ ఖాతాను సృష్టించండి', NULL, NULL, NULL, NULL)
ON CONFLICT (key_name) DO UPDATE SET 
en = EXCLUDED.en, hi = EXCLUDED.hi, te = EXCLUDED.te, 
ta = EXCLUDED.ta, kn = EXCLUDED.kn, ml = EXCLUDED.ml, mr = EXCLUDED.mr;

-- Enable Row Level Security (RLS) on translations
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;

-- Allow public read access to translations (anyone can view translations)
CREATE POLICY "Public can view translations" ON public.translations
    FOR SELECT USING (true);

-- Grant privileges so the API can read the table
GRANT SELECT ON public.translations TO anon;
GRANT SELECT ON public.translations TO authenticated;

-- Create a table for Products
CREATE TABLE public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    category TEXT,
    base_price NUMERIC,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view products" ON public.products FOR SELECT USING (true);
GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.products TO authenticated;

-- Create a table for Inventory
CREATE TABLE public.inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dealer_id UUID REFERENCES public.dealers(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    stock_quantity INTEGER DEFAULT 0,
    sales_velocity NUMERIC DEFAULT 0, -- avg sales per day
    status TEXT DEFAULT 'In Stock',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(dealer_id, product_id)
);

-- Enable RLS for Inventory
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view inventory" ON public.inventory FOR SELECT USING (true);
CREATE POLICY "Dealers can insert own inventory" ON public.inventory FOR INSERT WITH CHECK (
    dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid())
);
CREATE POLICY "Dealers can update own inventory" ON public.inventory FOR UPDATE USING (
    dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid())
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory TO authenticated;

-- Create a table for Sales
CREATE TABLE public.sales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dealer_id UUID REFERENCES public.dealers(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    sale_price NUMERIC NOT NULL,
    sale_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    is_bulk BOOLEAN DEFAULT false
);

-- Enable RLS for Sales
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dealers can view own sales" ON public.sales FOR SELECT USING (
    dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid())
);
CREATE POLICY "Dealers can insert own sales" ON public.sales FOR INSERT WITH CHECK (
    dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid())
);
GRANT SELECT, INSERT ON public.sales TO anon;
GRANT SELECT, INSERT ON public.sales TO authenticated;

-- Create a table for Network Requests (City Network)
CREATE TABLE public.network_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    requesting_dealer_id UUID REFERENCES public.dealers(id) ON DELETE CASCADE,
    fulfilling_dealer_id UUID REFERENCES public.dealers(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, accepted, rejected, completed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Network Requests
ALTER TABLE public.network_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dealers can view requests involving them" ON public.network_requests FOR SELECT USING (
    requesting_dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid()) OR
    fulfilling_dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid())
);
CREATE POLICY "Dealers can insert requests" ON public.network_requests FOR INSERT WITH CHECK (
    requesting_dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid())
);
CREATE POLICY "Dealers can update requests" ON public.network_requests FOR UPDATE USING (
    requesting_dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid()) OR
    fulfilling_dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid())
);
GRANT SELECT, INSERT, UPDATE ON public.network_requests TO anon;
GRANT SELECT, INSERT, UPDATE ON public.network_requests TO authenticated;

-- Create a table for Suppliers
CREATE TABLE public.suppliers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    rating NUMERIC DEFAULT 0,
    delivery_time_days INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Suppliers
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view suppliers" ON public.suppliers FOR SELECT USING (true);
GRANT SELECT ON public.suppliers TO anon;
GRANT SELECT ON public.suppliers TO authenticated;
