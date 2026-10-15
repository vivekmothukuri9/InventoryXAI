document.addEventListener('DOMContentLoaded', () => {
    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');
    const formLogin = document.getElementById('login-form');
    const formSignup = document.getElementById('signup-form');
    const btnLocation = document.getElementById('btn-location');

    // Tab switching logic
    if (tabLogin && tabSignup) {
        tabLogin.addEventListener('click', () => {
            tabLogin.classList.add('active');
            tabSignup.classList.remove('active');
            formLogin.classList.add('active');
            formSignup.classList.remove('active');
        });

        tabSignup.addEventListener('click', () => {
            tabSignup.classList.add('active');
            tabLogin.classList.remove('active');
            formSignup.classList.add('active');
            formLogin.classList.remove('active');
        });
    }

    // Location fetching logic
    if (btnLocation) {
        btnLocation.addEventListener('click', () => {
            if (navigator.geolocation) {
                btnLocation.textContent = 'Fetching location... ⏳';
                btnLocation.disabled = true;
                
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        const lat = position.coords.latitude;
                        const lon = position.coords.longitude;
                        
                        try {
                            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
                            const data = await response.json();
                            
                            if (data && data.address) {
                                const addr = data.address;
                                const city = addr.city || addr.town || addr.village || addr.county || '';
                                const state = addr.state || '';
                                const pincode = addr.postcode || '';
                                const addressStr = data.display_name || '';
                                
                                document.getElementById('city').value = city;
                                document.getElementById('state').value = state;
                                document.getElementById('pincode').value = pincode;
                                document.getElementById('address').value = addressStr;
                                
                                btnLocation.textContent = 'Location Added ✓';
                                btnLocation.style.background = 'rgba(52, 211, 153, 0.2)';
                                btnLocation.style.color = '#34d399';
                                btnLocation.style.borderColor = 'rgba(52, 211, 153, 0.3)';
                            } else {
                                throw new Error('Address not found');
                            }
                        } catch (error) {
                            alert('Could not fetch address details automatically. Please enter them manually.');
                            btnLocation.textContent = 'Use My Current Location 📍';
                            btnLocation.disabled = false;
                        }
                    },
                    (error) => {
                        alert('Geolocation failed or permission denied. Please enter address manually.');
                        btnLocation.textContent = 'Use My Current Location 📍';
                        btnLocation.disabled = false;
                    }
                );
            } else {
                alert('Geolocation is not supported by your browser.');
            }
        });
    }

    // --- Dummy OTP Setup for Testing ---
    const DUMMY_OTP = "123456";

    // 1. LOGIN FLOW
    const loginStatus = document.getElementById('login-status');

    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const btnSubmit = document.getElementById('btn-login-submit');
            let phone = document.getElementById('login-phone').value.trim();
            let password = document.getElementById('login-password').value;
            
            if (!phone || !password) {
                alert('Please enter your mobile number and password.');
                return;
            }

            btnSubmit.disabled = true;
            btnSubmit.textContent = 'Logging in...';
            loginStatus.textContent = '';

            try {
                // Login to Supabase using phone number as email
                const dummyEmail = phone + '@dealer.com';

                const { data, error } = await supabaseClient.auth.signInWithPassword({
                    email: dummyEmail,
                    password: password,
                });

                if (error) {
                    throw new Error('Account not found or incorrect password. Please Sign Up first.');
                }

                loginStatus.style.color = '#34d399';
                loginStatus.textContent = 'Logged in successfully!';
                
                setTimeout(() => {
                    window.location.href = '/';
                }, 500);

            } catch (error) {
                console.error("Login failed", error);
                loginStatus.style.color = '#ef4444';
                loginStatus.textContent = error.message || 'Login failed';
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.textContent = 'Login';
            }
        });
    }


    // 2. SIGNUP FLOW
    const btnSignupSendOtp = document.getElementById('btn-signup-send-otp');
    const signupStatus = document.getElementById('signup-status');

    if (btnSignupSendOtp) {
        btnSignupSendOtp.addEventListener('click', () => {
            let phone = document.getElementById('signup-phone').value.trim();
            
            // Form validation before sending OTP
            const name = document.getElementById('signup-name').value.trim();
            const shopName = document.getElementById('signup-shop').value.trim();
            const password = document.getElementById('signup-password').value;
            
            if (!name || !shopName || !phone || !password) {
                alert('Please fill out Name, Shop Name, Mobile Number, and Password first.');
                return;
            }
            
            if (password.length < 6) {
                alert('Password must be at least 6 characters long.');
                return;
            }

            btnSignupSendOtp.disabled = true;
            btnSignupSendOtp.textContent = 'Sending...';
            signupStatus.textContent = '';

            // Simulate sending OTP
            setTimeout(() => {
                btnSignupSendOtp.style.display = 'none';
                document.getElementById('signup-otp-group').style.display = 'block';
                document.getElementById('btn-signup-verify').style.display = 'block';
                signupStatus.style.color = '#34d399';
                signupStatus.textContent = `OTP Sent successfully! (Use ${DUMMY_OTP} for testing)`;
            }, 1000);
        });
    }

    if (formSignup) {
        formSignup.addEventListener('submit', async (e) => {
            e.preventDefault();
            const otp = document.getElementById('signup-otp').value.trim();
            const btnVerify = document.getElementById('btn-signup-verify');

            btnVerify.disabled = true;
            btnVerify.textContent = 'Verifying & Creating...';
            signupStatus.textContent = '';

            try {
                // 1. Verify Dummy OTP
                if (otp !== DUMMY_OTP) {
                    throw new Error('Incorrect OTP. Please try again.');
                }

                // 2. Fetch all input values
                const name = document.getElementById('signup-name').value.trim();
                const shopName = document.getElementById('signup-shop').value.trim();
                const category = document.getElementById('signup-category').value;
                let phone = document.getElementById('signup-phone').value.trim();
                const password = document.getElementById('signup-password').value;
                const gst = document.getElementById('gst-input')?.value.trim();
                const address = document.getElementById('address')?.value.trim();
                const city = document.getElementById('city')?.value.trim();
                const state = document.getElementById('state')?.value.trim();
                const pincode = document.getElementById('pincode')?.value.trim();

                const dummyEmail = phone + '@dealer.com';

                // 3. Create Supabase Account
                const { data: authData, error: authError } = await supabaseClient.auth.signUp({
                    email: dummyEmail,
                    password: password,
                    options: {
                        data: {
                            full_name: name,
                            role: 'dealer'
                        }
                    }
                });

                if (authError) {
                    if (authError.message.includes('already registered')) {
                        throw new Error('This number is already registered. Please Login.');
                    }
                    throw authError;
                }

                // Auto-login to get the session after auto-confirm
                const { data: loginData, error: loginError } = await supabaseClient.auth.signInWithPassword({
                    email: dummyEmail,
                    password: password,
                });

                if (loginError) {
                    throw new Error('Auto-login failed: ' + loginError.message);
                }

                // 4. Save to dealers table
                if (authData.user) {
                    const { error: dbError } = await supabaseClient
                        .from('dealers')
                        .insert([
                            {
                                user_id: authData.user.id,
                                full_name: name,
                                shop_name: shopName,
                                category: category,
                                phone: phone,
                                gst_number: gst || null,
                                address: address,
                                city: city,
                                state: state,
                                pincode: pincode
                            }
                        ]);

                    if (dbError) throw dbError;

                    signupStatus.style.color = '#34d399';
                    signupStatus.textContent = 'Account created successfully!';
                    
                    setTimeout(() => {
                        // Reset form and go to login
                        formSignup.reset();
                        document.getElementById('tab-login').click();
                        
                        // Reset OTP UI
                        btnSignupSendOtp.style.display = 'block';
                        btnSignupSendOtp.disabled = false;
                        btnSignupSendOtp.textContent = 'Send OTP';
                        document.getElementById('signup-otp-group').style.display = 'none';
                        document.getElementById('btn-signup-verify').style.display = 'none';
                        signupStatus.textContent = '';
                    }, 1000);
                }

            } catch (error) {
                console.error("Signup failed", error);
                signupStatus.style.color = '#ef4444';
                signupStatus.textContent = error.message || 'Error occurred';
            } finally {
                btnVerify.disabled = false;
                btnVerify.textContent = 'Verify & Create Account';
            }
        });
    }

    // GST Verification Logic
    const gstInput = document.getElementById('gst-input');
    const gstStatus = document.getElementById('gst-status');

    if (gstInput && gstStatus) {
        const btnVerifyGst = document.getElementById('btn-verify-gst');
        if (btnVerifyGst) {
            btnVerifyGst.addEventListener('click', async () => {
                const gst = gstInput.value.trim();
                if (gst.length !== 15 && gst !== '00000') {
                    if (gst.length > 0) {
                        gstStatus.textContent = 'Incorrect number';
                        gstStatus.style.color = '#ef4444';
                    } else {
                        gstStatus.textContent = '';
                    }
                    return;
                }

                gstStatus.innerHTML = '<div style="display: flex; align-items: center;"><div class="spinner"></div> Verifying...</div>';
                gstStatus.style.color = '#f59e0b';
                btnVerifyGst.disabled = true;

                if (gst === '00000') {
                    setTimeout(() => {
                        gstStatus.textContent = 'Verification successful';
                        gstStatus.style.color = '#34d399';
                        btnVerifyGst.disabled = false;
                    }, 1500);
                    return;
                }

                const url = `https://gst-insights-api.p.rapidapi.com/gst/${gst}`;
                const options = {
                    method: 'GET',
                    headers: {
                        'x-rapidapi-key': typeof CONFIG !== 'undefined' ? CONFIG.RAPIDAPI_KEY : '',
                        'x-rapidapi-host': 'gst-insights-api.p.rapidapi.com'
                    }
                };

                try {
                    const response = await fetch(url, options);
                    const data = await response.json();

                    if (response.ok && data.success) {
                        gstStatus.textContent = 'Verification successful';
                        gstStatus.style.color = '#34d399';
                    } else {
                        gstStatus.textContent = 'Incorrect number';
                        gstStatus.style.color = '#ef4444';
                    }
                } catch (error) {
                    console.error(error);
                    gstStatus.textContent = 'Incorrect number';
                    gstStatus.style.color = '#ef4444';
                } finally {
                    btnVerifyGst.disabled = false;
                }
            });
        }
    }
});
