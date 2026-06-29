/* ==========================================
   PNEUOUTLET - CHECKOUT & AUTHENTICATION
   ========================================== */

import { supabase, isSupabaseConfigured } from './supabase.js';

// NOTA: Token e offer_hash da TriboPay estão exclusivamente no server.js (backend seguro)

// --- LOAD CART DATA ---
let cart = JSON.parse(localStorage.getItem('pneu_outlet_cart') || '[]');

// Se o carrinho estiver vazio, volta pro catálogo
if (cart.length === 0) {
    alert("Seu carrinho está vazio. Escolha alguns pneus no catálogo primeiro!");
    window.location.href = '/index.html';
}

// --- DOM ELEMENTS ---
const elements = {
    checkoutItemsList: document.getElementById('checkoutItemsList'),
    checkoutForm: document.getElementById('checkoutForm'),
    
    // Auth & Main Content Sections
    authSection: document.getElementById('authSection'),
    checkoutMainContent: document.getElementById('checkoutMainContent'),
    headerUserInfo: document.getElementById('headerUserInfo'),
    
    // Tabs & Forms
    tabBtnRegister: document.getElementById('tabBtnRegister'),
    tabBtnLogin: document.getElementById('tabBtnLogin'),
    registerForm: document.getElementById('registerForm'),
    loginForm: document.getElementById('loginForm'),
    
    // Registration Inputs
    regName: document.getElementById('regName'),
    regCpf: document.getElementById('regCpf'),
    regPhone: document.getElementById('regPhone'),
    regEmail: document.getElementById('regEmail'),
    regPassword: document.getElementById('regPassword'),
    regPasswordConfirm: document.getElementById('regPasswordConfirm'),
    
    // Login Inputs
    loginEmail: document.getElementById('loginEmail'),
    loginPassword: document.getElementById('loginPassword'),
    
    // Billing Fields (Readonly)
    custName: document.getElementById('custName'),
    custCpf: document.getElementById('custCpf'),
    custPhone: document.getElementById('custPhone'),
    custEmail: document.getElementById('custEmail'),
    
    // Delivery Inputs
    shippingCep: document.getElementById('shippingCep'),
    btnSearchCep: document.getElementById('btnSearchCep'),
    shippingStreet: document.getElementById('shippingStreet'),
    shippingNumber: document.getElementById('shippingNumber'),
    shippingCompl: document.getElementById('shippingCompl'),
    shippingNeighborhood: document.getElementById('shippingNeighborhood'),
    shippingCity: document.getElementById('shippingCity'),
    shippingState: document.getElementById('shippingState'),
    
    // Upsells
    upsellAlignment: document.getElementById('upsellAlignment'),
    upsellWarranty: document.getElementById('upsellWarranty'),
    upsellWarrantyPriceText: document.getElementById('upsellWarrantyPriceText'),
    
    // Price Statement
    statementSubtotal: document.getElementById('statementSubtotal'),
    statementOutletSaving: document.getElementById('statementOutletSaving'),
    rowQtyDiscount: document.getElementById('rowQtyDiscount'),
    statementQtySaving: document.getElementById('statementQtySaving'),
    rowUpsell: document.getElementById('rowUpsell'),
    statementUpsellTotal: document.getElementById('statementUpsellTotal'),
    rowPixDiscount: document.getElementById('rowPixDiscount'),
    statementPixSaving: document.getElementById('statementPixSaving'),
    statementTotal: document.getElementById('statementTotal'),
    btnPlaceOrder: document.getElementById('btnPlaceOrder'),
    
    // Gateway Modals
    gatewayOverlay: document.getElementById('gatewayOverlay'),
    modalPixGateway: document.getElementById('modalPixGateway'),
    closePixModal: document.getElementById('closePixModal'),
    btnCopyPix: document.getElementById('btnCopyPix'),
    pixGatewayValue: document.getElementById('pixGatewayValue'),
    pixCodeText: document.getElementById('pixCodeText'),
    pixTimerSeconds: document.getElementById('pixTimerSeconds'),
    btnSuccessOk: document.getElementById('btnSuccessOk'),
    modalSuccessGateway: document.getElementById('modalSuccessGateway'),
    successOrderNum: document.getElementById('successOrderNum'),
    successTotalPaid: document.getElementById('successTotalPaid')
};

// --- STATE ---
let currentUser = null;
let totalTiresCount = cart.reduce((sum, item) => sum + item.quantity, 0);
let warrantyPricePerTire = 29.90;
let totalWarrantyPrice = totalTiresCount * warrantyPricePerTire;
let pollingInterval = null;
let pixInterval = null;
let activeTransactionHash = null; // hash da transação ativa (escopo de módulo, não global)

// --- INITIALIZATION ---
async function init() {
    // 1. Render dynamic warranty labels
    elements.upsellWarrantyPriceText.textContent = `+R$ ${totalWarrantyPrice.toFixed(2)}`;
    
    // 2. Render Checkout Items
    renderCheckoutItems();
    
    // 3. Setup Listeners
    initListeners();
    
    // 4. Check Authentication State
    await checkAuthState();
    
    // 5. Calculate Initial Prices
    calculateTotals();
}

// --- CHECK AUTHENTICATION STATE ---
async function checkAuthState() {
    if (isSupabaseConfigured) {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) throw error;
            
            if (session && session.user) {
                // Carrega dados adicionais do perfil do Supabase Database (profiles)
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('name, cpf, phone')
                    .eq('id', session.user.id)
                    .single();
                
                if (profileError) {
                    console.warn("Perfil não encontrado no banco, usando dados da sessão.");
                    currentUser = {
                        id: session.user.id,
                        email: session.user.email,
                        name: session.user.user_metadata.name || "Cliente",
                        cpf: "Não informado",
                        phone: "Não informado"
                    };
                } else {
                    currentUser = {
                        id: session.user.id,
                        email: session.user.email,
                        name: profile.name,
                        cpf: profile.cpf,
                        phone: profile.phone
                    };
                }
            } else {
                currentUser = null;
            }
        } catch (err) {
            console.error("Erro ao verificar sessão no Supabase:", err);
            currentUser = null;
        }
    } else {
        // Fallback local pelo localStorage
        currentUser = JSON.parse(localStorage.getItem('pneu_outlet_user') || 'null');
    }
    
    renderAuthUI();
}

function renderAuthUI() {
    if (currentUser) {
        // Se logado, mostra o checkout e esconde portal de login
        elements.authSection.classList.add('hidden');
        elements.checkoutMainContent.classList.remove('hidden');
        
        // Render user status header
        elements.headerUserInfo.innerHTML = `
            <span>Olá, <strong>${currentUser.name.split(' ')[0]}</strong>!</span>
            <button class="btn-logout" id="btnLogout">Desconectar</button>
        `;
        
        // Auto-fill billing data (readonly)
        elements.custName.value = currentUser.name;
        elements.custCpf.value = formatCPF(currentUser.cpf);
        elements.custPhone.value = currentUser.phone;
        elements.custEmail.value = currentUser.email;
        
        // Bind logout listener
        document.getElementById('btnLogout').addEventListener('click', logout);
    } else {
        // Se deslogado, esconde checkout e mostra login
        elements.authSection.classList.remove('hidden');
        elements.checkoutMainContent.classList.add('hidden');
        elements.headerUserInfo.innerHTML = "";
        
        // Adiciona indicador de modo do banco de dados no final do formulário
        showDbModeIndicator();
    }
}

function showDbModeIndicator() {
    let indicator = document.getElementById('authModeIndicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'authModeIndicator';
        indicator.style.fontSize = '0.8rem';
        indicator.style.textAlign = 'center';
        indicator.style.marginTop = '1.5rem';
        indicator.style.color = 'var(--text-secondary)';
        indicator.style.borderTop = '1px solid var(--glass-border)';
        indicator.style.paddingTop = '1rem';
        elements.authSection.querySelector('.auth-card').appendChild(indicator);
    }
    
    if (isSupabaseConfigured) {
        indicator.innerHTML = `🟢 <strong>Banco de Dados Global (Supabase) Ativo</strong>`;
    } else {
        indicator.innerHTML = `🟡 <strong>Modo Simulação Local (Offline)</strong><br><span style="font-size: 0.75rem; color: #888; display: block; margin-top: 0.25rem;">Configure as chaves do Supabase no arquivo <code>.env</code> para salvar cadastros de forma centralizada.</span>`;
    }
}

async function logout() {
    if (isSupabaseConfigured) {
        await supabase.auth.signOut();
    } else {
        localStorage.removeItem('pneu_outlet_user');
    }
    window.location.reload();
}

function formatCPF(cpf) {
    const clean = cpf.replace(/\D/g, '');
    if (clean.length !== 11) return clean;
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function renderCheckoutItems() {
    elements.checkoutItemsList.innerHTML = cart.map(item => {
        const qty = item.quantity;
        let discountPercent = 0;
        let badgeText = "";
        
        if (qty >= 4) {
            discountPercent = 30;
            badgeText = " (Jogo 30% OFF)";
        } else if (qty >= 2) {
            discountPercent = 15;
            badgeText = " (Par 15% OFF)";
        }
        
        const basePrice = item.product.outletPrice;
        const finalItemPrice = basePrice * (1 - (discountPercent / 100)) * qty;
        
        return `
            <div class="checkout-item-row">
                <div class="checkout-item-name-box">
                    <strong>${item.product.brand} ${item.product.model}</strong>
                    <span>Qtd: ${qty} x R$ ${basePrice.toFixed(2)}${badgeText}</span>
                </div>
                <div class="checkout-item-price-box">
                    R$ ${finalItemPrice.toFixed(2)}
                </div>
            </div>
        `;
    }).join('');
}

// --- MÁSCARAS DE INPUT ---
function applyMask(value, mask) {
    let result = '';
    let valueIdx = 0;
    const digits = value.replace(/\D/g, '');
    for (let i = 0; i < mask.length && valueIdx < digits.length; i++) {
        if (mask[i] === '9') {
            result += digits[valueIdx++];
        } else {
            result += mask[i];
        }
    }
    return result;
}

function initListeners() {
    // --- AUTHENTICATION TAB SWITCHING ---
    elements.tabBtnRegister.addEventListener('click', () => {
        elements.tabBtnRegister.classList.add('active');
        elements.tabBtnLogin.classList.remove('active');
        elements.registerForm.classList.remove('hidden');
        elements.loginForm.classList.add('hidden');
    });

    elements.tabBtnLogin.addEventListener('click', () => {
        elements.tabBtnLogin.classList.add('active');
        elements.tabBtnRegister.classList.remove('active');
        elements.loginForm.classList.remove('hidden');
        elements.registerForm.classList.add('hidden');
    });

    // --- MÁSCARAS DE CPF E TELEFONE ---
    elements.regCpf.addEventListener('input', (e) => {
        e.target.value = applyMask(e.target.value, '999.999.999-99');
    });
    elements.regPhone.addEventListener('input', (e) => {
        const digits = e.target.value.replace(/\D/g, '');
        if (digits.length <= 10) {
            e.target.value = applyMask(e.target.value, '(99) 9999-9999');
        } else {
            e.target.value = applyMask(e.target.value, '(99) 99999-9999');
        }
    });

    // --- SUBMIT REGISTRATION ---
    elements.registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = elements.regName.value.trim();
        const cpf = elements.regCpf.value.replace(/\D/g, '');
        const phone = elements.regPhone.value.trim();
        const email = elements.regEmail.value.trim().toLowerCase();
        const password = elements.regPassword.value;
        const passwordConfirm = elements.regPasswordConfirm.value;
        
        // Validações
        if (cpf.length !== 11) {
            alert("Por favor, insira um CPF válido com 11 dígitos.");
            return;
        }
        if (password !== passwordConfirm) {
            alert("A confirmação de senha não confere. Digite senhas iguais.");
            return;
        }
        if (password.length < 6) {
            alert("A senha deve ter pelo menos 6 caracteres.");
            return;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert("Insira um endereço de e-mail válido.");
            return;
        }
        
        if (isSupabaseConfigured) {
            // LÓGICA DE CADASTRO COM O SUPABASE DATABASE
            const submitBtn = elements.registerForm.querySelector('button[type="submit"]');
            submitBtn.textContent = "Processando Cadastro...";
            submitBtn.disabled = true;
            
            try {
                // 1. Cadastra na Autenticação do Supabase
                // cpf e phone são passados como metadata — o trigger no banco cria o perfil automaticamente
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { name, cpf, phone }
                    }
                });
                
                if (authError) throw authError;
                
                if (authData && authData.user) {
                    // O trigger on_auth_user_created no Supabase insere o perfil automaticamente
                    // Não é necessário INSERT manual — evita violação de política RLS
                    alert("Cadastro realizado com sucesso! Verifique seu e-mail para confirmar.");
                    await checkAuthState();
                }
            } catch (err) {
                console.error("Erro no cadastro do Supabase:", err);
                alert("Erro ao cadastrar: " + (err.message || err));
            } finally {
                submitBtn.textContent = "Criar Conta e Prosseguir";
                submitBtn.disabled = false;
            }
        } else {
            // FALLBACK: LÓGICA LOCAL DO LOCALSTORAGE
            let accounts = JSON.parse(localStorage.getItem('pneu_outlet_accounts') || '[]');
            
            if (accounts.some(acc => acc.email === email)) {
                alert("Este e-mail já está cadastrado localmente. Vá em 'Já tenho Conta'.");
                return;
            }
            if (accounts.some(acc => acc.cpf === cpf)) {
                alert("Este CPF já possui cadastro local.");
                return;
            }
            
            const newAccount = { name, cpf, phone, email, password };
            accounts.push(newAccount);
            localStorage.setItem('pneu_outlet_accounts', JSON.stringify(accounts));
            
            localStorage.setItem('pneu_outlet_user', JSON.stringify(newAccount));
            currentUser = newAccount;
            
            alert("Cadastro local realizado com sucesso! (Modo Simulação)");
            await checkAuthState();
        }
    });

    // --- SUBMIT LOGIN ---
    elements.loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = elements.loginEmail.value.trim().toLowerCase();
        const password = elements.loginPassword.value;
        
        if (isSupabaseConfigured) {
            // LÓGICA DE LOGIN COM O SUPABASE
            const submitBtn = elements.loginForm.querySelector('button[type="submit"]');
            submitBtn.textContent = "Verificando Credenciais...";
            submitBtn.disabled = true;
            
            try {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });
                
                if (error) throw error;
                
                await checkAuthState();
            } catch (err) {
                console.error("Erro de login no Supabase:", err);
                alert("E-mail ou senha incorretos.");
            } finally {
                submitBtn.textContent = "Acessar e Prosseguir";
                submitBtn.disabled = false;
            }
        } else {
            // FALLBACK: LÓGICA LOCAL DO LOCALSTORAGE
            let accounts = JSON.parse(localStorage.getItem('pneu_outlet_accounts') || '[]');
            const account = accounts.find(acc => acc.email === email && acc.password === password);
            
            if (account) {
                localStorage.setItem('pneu_outlet_user', JSON.stringify(account));
                currentUser = account;
                await checkAuthState();
            } else {
                alert("E-mail ou senha incorretos.");
            }
        }
    });

    // --- VIA CEP API ---
    function buscarCep(cepRaw) {
        const cep = cepRaw.replace(/\D/g, '');
        if (cep.length !== 8) return;

        elements.btnSearchCep.textContent = "Buscando...";
        elements.btnSearchCep.disabled = true;

        fetch(`https://viacep.com.br/ws/${cep}/json/`)
            .then(response => {
                if (!response.ok) throw new Error("Erro na rede");
                return response.json();
            })
            .then(data => {
                if (data.erro) {
                    alert("CEP não encontrado. Preencha o endereço manualmente.");
                    return;
                }
                elements.shippingStreet.value = data.logradouro || "";
                elements.shippingNeighborhood.value = data.bairro || "";
                elements.shippingCity.value = data.localidade || "";
                elements.shippingState.value = data.uf || "";
                elements.shippingNumber.focus();
            })
            .catch(error => {
                console.error("Erro ao buscar CEP:", error);
                alert("Erro ao conectar à consulta de CEP. Preencha manualmente.");
            })
            .finally(() => {
                elements.btnSearchCep.textContent = "Buscar";
                elements.btnSearchCep.disabled = false;
            });
    }

    // Busca automática ao completar 8 dígitos
    elements.shippingCep.addEventListener('input', (e) => {
        const digits = e.target.value.replace(/\D/g, '');
        if (digits.length === 8) buscarCep(digits);
    });

    elements.btnSearchCep.addEventListener('click', () => {
        buscarCep(elements.shippingCep.value);
    });

    // Upsell Checkboxes
    elements.upsellAlignment.addEventListener('change', calculateTotals);
    elements.upsellWarranty.addEventListener('change', calculateTotals);

    // Place Order Button
    elements.btnPlaceOrder.addEventListener('click', processOrderSubmit);

    // Success OK Button
    elements.btnSuccessOk.addEventListener('click', () => {
        localStorage.removeItem('pneu_outlet_cart');
        window.location.href = '/index.html';
    });

    // Close Pix Modal
    elements.closePixModal.addEventListener('click', () => {
        elements.gatewayOverlay.classList.remove('active');
        elements.modalPixGateway.classList.remove('active');
        if (pollingInterval) clearInterval(pollingInterval);
        if (pixInterval) clearInterval(pixInterval);
    });

    // Copy Pix Code
    elements.btnCopyPix.addEventListener('click', () => {
        elements.pixCodeText.select();
        elements.pixCodeText.setSelectionRange(0, 99999);
        navigator.clipboard.writeText(elements.pixCodeText.value);
        
        elements.btnCopyPix.textContent = "Copiado!";
        setTimeout(() => {
            elements.btnCopyPix.textContent = "Copiar Pix";
        }, 2000);
    });
}

// --- CALCULATE FINANCES ---
let calculatedFinalTotal = 0;

function calculateTotals() {
    let subtotalOriginal = 0;
    let totalOutletBase = 0;
    let totalQtySavings = 0;
    
    cart.forEach(item => {
        const qty = item.quantity;
        const origPrice = item.product.originalPrice * qty;
        const baseOutlet = item.product.outletPrice * qty;
        
        let extraDiscount = 0;
        if (qty >= 4) {
            extraDiscount = 0.3; // 30% Jogo
        } else if (qty >= 2) {
            extraDiscount = 0.15; // 15% Par
        }
        
        const qtySaving = baseOutlet * extraDiscount;
        const finalOutletItemPrice = baseOutlet - qtySaving;
        
        subtotalOriginal += origPrice;
        totalOutletBase += baseOutlet;
        totalQtySavings += qtySaving;
    });

    const outletSaving = subtotalOriginal - totalOutletBase;
    
    // Upsells
    let upsellTotal = 0;
    if (elements.upsellAlignment.checked) {
        upsellTotal += 79.90;
    }
    if (elements.upsellWarranty.checked) {
        upsellTotal += totalWarrantyPrice;
    }
    
    // Display Upsell rows in table
    if (upsellTotal > 0) {
        elements.rowUpsell.style.display = "flex";
        elements.statementUpsellTotal.textContent = `+R$ ${upsellTotal.toFixed(2)}`;
    } else {
        elements.rowUpsell.style.display = "none";
    }

    // Display Qty discounts row
    if (totalQtySavings > 0) {
        elements.rowQtyDiscount.style.display = "flex";
        elements.statementQtySaving.textContent = `-R$ ${totalQtySavings.toFixed(2)}`;
    } else {
        elements.rowQtyDiscount.style.display = "none";
    }

    // Total of outlet products + upsells
    const basePayable = (totalOutletBase - totalQtySavings) + upsellTotal;
    
    // Pix Discount (Always applied as payment is exclusive Pix)
    const pixSaving = basePayable * 0.1; // 10% OFF
    elements.rowPixDiscount.style.display = "flex";
    elements.statementPixSaving.textContent = `-R$ ${pixSaving.toFixed(2)}`;

    const finalTotal = basePayable - pixSaving;
    calculatedFinalTotal = finalTotal;

    // Render price table
    elements.statementSubtotal.textContent = `R$ ${subtotalOriginal.toFixed(2)}`;
    elements.statementOutletSaving.textContent = `-R$ ${outletSaving.toFixed(2)}`;
    elements.statementTotal.textContent = `R$ ${finalTotal.toFixed(2)}`;
}

// --- SUBMIT ORDER & TRIBOPAY INTEGRATION (via Express Backend) ---
async function processOrderSubmit() {
    // Validação nativa do formulário de entrega
    const fieldsToValidate = [
        elements.shippingCep,
        elements.shippingStreet,
        elements.shippingNumber,
        elements.shippingCompl,
        elements.shippingNeighborhood,
        elements.shippingCity,
        elements.shippingState
    ];

    // Verifica validade (exceto complemento que é opcional)
    for (let field of fieldsToValidate) {
        if (field.id === 'shippingCompl') continue; // complemento é opcional
        if (field.required && !field.value.trim()) {
            field.reportValidity();
            return;
        }
    }

    elements.btnPlaceOrder.textContent = "Processando Transação...";
    elements.btnPlaceOrder.disabled = true;

    try {
        const amountInCents = Math.round(calculatedFinalTotal * 100);
        
        // Monta os itens do carrinho para log interno (sem product_hash por pneu)
        // O offer_hash fixo já está configurado no backend via .env
        const cartItems = cart.map(item => {
            const qty = item.quantity;
            let discountPercent = 0;
            if (qty >= 4) discountPercent = 30;
            else if (qty >= 2) discountPercent = 15;
            const basePrice = item.product.outletPrice;
            const finalItemPrice = basePrice * (1 - (discountPercent / 100));
            
            return {
                id: item.product.id,
                title: `${item.product.brand} ${item.product.model} (${item.product.width}/${item.product.profile} R${item.product.rim})`,
                price: Math.round(finalItemPrice * 100),
                quantity: qty,
                operation_type: 1,
                tangible: true
            };
        });

        const payload = {
            amount: amountInCents,
            payment_method: "pix",
            customer: {
                name: currentUser.name,
                email: currentUser.email,
                phone_number: currentUser.phone.replace(/\D/g, ''),
                document: currentUser.cpf.replace(/\D/g, ''),
                street_name: elements.shippingStreet.value,
                number: elements.shippingNumber.value,
                complement: elements.shippingCompl.value,
                neighborhood: elements.shippingNeighborhood.value,
                city: elements.shippingCity.value,
                state: elements.shippingState.value,
                zip_code: elements.shippingCep.value.replace(/\D/g, '')
            },
            cart: cartItems,
            expire_in_days: 1,
            transaction_origin: "api"
        };

        // Chamada à API local do Express Server (via proxy)
        const response = await fetch('/api/checkout', {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                payload: payload,
                user_id: currentUser ? currentUser.id : null
            })
        });

        const resData = await response.json();

        if (!response.ok || !resData.hash) {
            let errMsg = resData.message || resData.error || "Erro ao processar transação.";
            if (resData.errors) {
                const detailedErrors = [];
                for (const key in resData.errors) {
                    detailedErrors.push(`${key}: ${resData.errors[key].join(', ')}`);
                }
                errMsg += " Detalhes: " + detailedErrors.join(" | ");
            }
            throw new Error(errMsg);
        }

        const transaction = resData;
        activeTransactionHash = transaction.hash; // salvo no escopo do módulo, não global

        // Renderiza o QR Code retornado gerando imagem dinamicamente pela API de QR Code
        const qrContainer = document.querySelector('.pix-qr-code-box');
        if (qrContainer && transaction.pix && transaction.pix.pix_qr_code) {
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(transaction.pix.pix_qr_code)}`;
            qrContainer.innerHTML = `<img src="${qrUrl}" alt="QR Code Pix" style="width: 100%; max-width: 220px; height: auto; border-radius: 12px; margin: 0 auto; display: block;">`;
        }

        // Código Copia e Cola
        elements.pixCodeText.value = transaction.pix ? transaction.pix.pix_qr_code : "";
        
        // Abre o modal
        elements.gatewayOverlay.classList.add('active');
        elements.pixGatewayValue.textContent = `R$ ${calculatedFinalTotal.toFixed(2)}`;
        elements.modalPixGateway.classList.add('active');

        // Inicia cronômetro (5 minutos)
        startPixCountdown(300);

        // Inicia Polling de Status para aprovação automática na tela
        startPaymentPolling(transaction.hash);

    } catch (error) {
        console.error("Erro ao processar checkout:", error);
        alert(`Erro ao finalizar a compra:\n"${error.message}"`);
    } finally {
        elements.btnPlaceOrder.textContent = "Confirmar e Pagar";
        elements.btnPlaceOrder.disabled = false;
    }
}

function startPixCountdown(durationSeconds) {
    if (pixInterval) clearInterval(pixInterval);
    
    let timer = durationSeconds;
    
    const updateTimerText = () => {
        let minutes = parseInt(timer / 60, 10);
        let seconds = parseInt(timer % 60, 10);

        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;

        elements.pixTimerSeconds.textContent = `${minutes}:${seconds}`;

        if (--timer < 0) {
            clearInterval(pixInterval);
            if (pollingInterval) clearInterval(pollingInterval);
            elements.pixTimerSeconds.textContent = "Expirado";
            alert("O código Pix expirou. Por favor, tente finalizar a compra novamente.");
            elements.gatewayOverlay.classList.remove('active');
            elements.modalPixGateway.classList.remove('active');
        }
    };
    
    updateTimerText();
    pixInterval = setInterval(updateTimerText, 1000);
}

function startPaymentPolling(hash) {
    if (pollingInterval) clearInterval(pollingInterval);
    
    const MAX_ATTEMPTS = 150; // 150 x 3s = 7.5 minutos máximo
    let attempts = 0;

    pollingInterval = setInterval(async () => {
        attempts++;
        if (attempts > MAX_ATTEMPTS) {
            clearInterval(pollingInterval);
            console.warn("Polling encerrado: tempo máximo atingido.");
            return;
        }
        try {
            const response = await fetch(`/api/orders/${hash}`);
            if (response.ok) {
                const resData = await response.json();
                if (resData.success && resData.payment_status === "paid") {
                    clearInterval(pollingInterval);
                    if (pixInterval) clearInterval(pixInterval);
                    elements.modalPixGateway.classList.remove('active');
                    showSuccessScreen(hash);
                } else if (resData.payment_status === "expired" || resData.payment_status === "canceled") {
                    clearInterval(pollingInterval);
                    if (pixInterval) clearInterval(pixInterval);
                    elements.gatewayOverlay.classList.remove('active');
                    elements.modalPixGateway.classList.remove('active');
                    alert("O pagamento foi cancelado ou expirou. Tente novamente.");
                }
            }
        } catch (err) {
            console.warn("Erro ao consultar status do Pix:", err);
        }
    }, 3000);
}

function showSuccessScreen(orderNum) {
    elements.successOrderNum.textContent = orderNum || ("#PO-" + Math.floor(10000 + Math.random() * 90000));
    elements.successTotalPaid.textContent = `R$ ${calculatedFinalTotal.toFixed(2)}`;
    elements.modalSuccessGateway.classList.add('active');
}

// Start Checkout
init();


