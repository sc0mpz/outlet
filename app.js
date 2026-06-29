/* ==========================================
   PNEUOUTLET - APPLICATION LOGIC
   ========================================== */

// --- DATASET: 8 Pneus Premium com Medidas e Preços reais ---
const PNEUS_DATA = [
    {
        id: 1,
        brand: "Pirelli",
        model: "Cinturato P1",
        width: 165,
        profile: 70,
        rim: 14,
        loadIndex: 81,
        speedRating: "T",
        vehicle: "Carro",
        originalPrice: 370.00,
        outletPrice: 222.00,
        image: "/assets/pirelli_cinturato_p1.png",
        description: "Pneu ideal para carros compactos urbanos como Fiat Mobi e Renault Kwid. Extremamente econômico, com excelente rendimento quilométrico para poupar no seu dia a dia.",
        fuelEfficiency: "C",
        wetGrip: "B",
        noiseLevel: 70
    },
    {
        id: 2,
        brand: "Goodyear",
        model: "Kelly Edge Touring",
        width: 175,
        profile: 70,
        rim: 14,
        loadIndex: 84,
        speedRating: "T",
        vehicle: "Carro",
        originalPrice: 399.00,
        outletPrice: 239.40,
        image: "/assets/goodyear_kelly_edge.png",
        description: "Pneu de alta durabilidade e confiabilidade desenvolvido para carros de passeio populares como Hyundai HB20, Fiat Strada e VW Gol. Ótima tração para as ruas brasileiras.",
        fuelEfficiency: "C",
        wetGrip: "C",
        noiseLevel: 71
    },
    {
        id: 3,
        brand: "Michelin",
        model: "Energy XM2+",
        width: 185,
        profile: 60,
        rim: 15,
        loadIndex: 88,
        speedRating: "H",
        vehicle: "Carro",
        originalPrice: 549.00,
        outletPrice: 329.40,
        image: "/assets/michelin_energy_xm2.png",
        description: "Super resistente e com durabilidade acima da média. Perfeito para hatchbacks populares brasileiros como Hyundai HB20, Fiat Argo e Toyota Yaris.",
        fuelEfficiency: "B",
        wetGrip: "A",
        noiseLevel: 70
    },
    {
        id: 4,
        brand: "Bridgestone",
        model: "Ecopia EP150",
        width: 185,
        profile: 65,
        rim: 15,
        loadIndex: 88,
        speedRating: "H",
        vehicle: "Carro",
        originalPrice: 529.00,
        outletPrice: 317.40,
        image: "/assets/bridgestone_ecopia_ep150.png",
        description: "Pneu ecologicamente correto com baixa resistência ao rolamento, reduzindo o consumo de combustível. Ideal para Chevrolet Onix, Renault Sandero, Logan e Nissan Versa.",
        fuelEfficiency: "B",
        wetGrip: "B",
        noiseLevel: 69
    },
    {
        id: 5,
        brand: "Pirelli",
        model: "Cinturato P7",
        width: 195,
        profile: 55,
        rim: 16,
        loadIndex: 87,
        speedRating: "V",
        vehicle: "Carro",
        originalPrice: 649.00,
        outletPrice: 389.40,
        image: "/assets/pirelli_cinturato_p7.png",
        description: "Opção de alta performance com aderência superior nas curvas e estabilidade sob chuva. Excelente escolha para Volkswagen Polo, Virtus, Cronos e Onix Plus.",
        fuelEfficiency: "C",
        wetGrip: "A",
        noiseLevel: 71
    },
    {
        id: 6,
        brand: "Michelin",
        model: "Primacy 4",
        width: 205,
        profile: 55,
        rim: 16,
        loadIndex: 91,
        speedRating: "V",
        vehicle: "Carro",
        originalPrice: 699.00,
        outletPrice: 419.40,
        image: "/assets/michelin_primacy_4.png",
        description: "Referência em segurança e durabilidade. Mantém frenagens muito curtas em piso molhado do primeiro ao último quilômetro. Excelente para Toyota Corolla, Honda Civic e Cruze.",
        fuelEfficiency: "B",
        wetGrip: "A",
        noiseLevel: 70
    },
    {
        id: 7,
        brand: "Goodyear",
        model: "EfficientGrip SUV",
        width: 205,
        profile: 65,
        rim: 16,
        loadIndex: 95,
        speedRating: "H",
        vehicle: "SUV",
        originalPrice: 799.00,
        outletPrice: 479.40,
        image: "/assets/goodyear_efficientgrip_suv.png",
        description: "Desenvolvido especificamente para SUVs populares como Hyundai Creta, Nissan Kicks e Renault Duster. Entrega maciez na rodagem e excelente frenagem no molhado.",
        fuelEfficiency: "B",
        wetGrip: "B",
        noiseLevel: 68
    },
    {
        id: 8,
        brand: "Pirelli",
        model: "Scorpion HT",
        width: 225,
        profile: 60,
        rim: 17,
        loadIndex: 99,
        speedRating: "H",
        vehicle: "SUV",
        originalPrice: 1099.00,
        outletPrice: 659.40,
        image: "/assets/pirelli_scorpion_ht.png",
        description: "Pneu robusto e versátil para pick-ups e SUVs grandes como Jeep Compass, Fiat Toro e Jeep Renegade. Excelente tração para vias urbanas e estradas de terra.",
        fuelEfficiency: "C",
        wetGrip: "C",
        noiseLevel: 72
    }
];

// --- APP STATE ---
let state = {
    cart: JSON.parse(localStorage.getItem('pneu_outlet_cart') || '[]'),
    filters: {
        search: '',
        vehicle: '', // Carro, SUV, Van
        width: '',
        profile: '',
        rim: '',
        brand: ''
    },
    sortBy: 'discount' // discount, price-asc, price-desc, brand
};

// --- DOM ELEMENTS ---
const elements = {
    header: document.getElementById('mainHeader'),
    productsGrid: document.getElementById('productsGrid'),
    noResults: document.getElementById('noResultsState'),
    resultsCount: document.getElementById('resultsCount'),
    
    // Inputs & Filters
    searchInput: document.getElementById('searchInput'),
    vehicleButtons: document.querySelectorAll('.vehicle-btn'),
    filterWidth: document.getElementById('filterWidth'),
    filterProfile: document.getElementById('filterProfile'),
    filterRim: document.getElementById('filterRim'),
    filterBrand: document.getElementById('filterBrand'),
    btnResetFilters: document.getElementById('btnResetFilters'),
    btnResetFiltersEmpty: document.getElementById('btnResetFiltersEmpty'),
    sortSelect: document.getElementById('sortSelect'),
    
    // Cart Drawer
    cartToggle: document.getElementById('cartToggle'),
    cartDrawer: document.getElementById('cartDrawer'),
    cartDrawerOverlay: document.getElementById('cartDrawerOverlay'),
    closeCartBtn: document.getElementById('closeCartBtn'),
    cartItemsList: document.getElementById('cartItemsList'),
    cartBadgeCount: document.getElementById('cartBadgeCount'),
    
    // Cart Summary
    cartSubtotalSemDesconto: document.getElementById('cartSubtotalSemDesconto'),
    cartDiscountSavings: document.getElementById('cartDiscountSavings'),
    cartTotalPayable: document.getElementById('cartTotalPayable'),
    cartPixPrice: document.getElementById('cartPixPrice'),
    checkoutBtn: document.getElementById('checkoutBtn'),
    
    // Modal Product Details
    productModal: document.getElementById('productModal'),
    productModalOverlay: document.getElementById('productModalOverlay'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    modalProductDetails: document.getElementById('modalProductDetails')
};

// --- EVENT LISTENERS ---
function initEventListeners() {
    // Header Scroll effect
    window.addEventListener('scroll', () => {
        if (window.scrollY > 20) {
            elements.header.classList.add('scrolled');
        } else {
            elements.header.classList.remove('scrolled');
        }
    });

    // Search and Filters
    elements.searchInput.addEventListener('input', (e) => {
        state.filters.search = e.target.value;
        renderCatalog();
    });

    elements.vehicleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.getAttribute('data-type');
            if (state.filters.vehicle === type) {
                state.filters.vehicle = ''; // deselect
                btn.classList.remove('active');
            } else {
                state.filters.vehicle = type;
                elements.vehicleButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            }
            renderCatalog();
        });
    });

    elements.filterWidth.addEventListener('change', (e) => {
        state.filters.width = e.target.value;
        renderCatalog();
    });

    elements.filterProfile.addEventListener('change', (e) => {
        state.filters.profile = e.target.value;
        renderCatalog();
    });

    elements.filterRim.addEventListener('change', (e) => {
        state.filters.rim = e.target.value;
        renderCatalog();
    });

    elements.filterBrand.addEventListener('change', (e) => {
        state.filters.brand = e.target.value;
        renderCatalog();
    });

    // Reset Filters
    const resetAll = () => {
        state.filters = { search: '', vehicle: '', width: '', profile: '', rim: '', brand: '' };
        elements.searchInput.value = '';
        elements.filterWidth.value = '';
        elements.filterProfile.value = '';
        elements.filterRim.value = '';
        elements.filterBrand.value = '';
        elements.vehicleButtons.forEach(b => b.classList.remove('active'));
        renderCatalog();
    };
    elements.btnResetFilters.addEventListener('click', resetAll);
    elements.btnResetFiltersEmpty.addEventListener('click', resetAll);

    // Sorting
    elements.sortSelect.addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        renderCatalog();
    });

    // Cart Drawer Toggle
    elements.cartToggle.addEventListener('click', toggleCart);
    elements.closeCartBtn.addEventListener('click', toggleCart);
    elements.cartDrawerOverlay.addEventListener('click', toggleCart);

    // Modal Close
    elements.closeModalBtn.addEventListener('click', toggleModal);
    elements.productModalOverlay.addEventListener('click', toggleModal);
    
    // Checkout redirection
    elements.checkoutBtn.addEventListener('click', () => {
        if (state.cart.length === 0) return;
        window.location.href = '/checkout.html';
    });
}

// --- CART ACTIONS ---
function toggleCart() {
    elements.cartDrawer.classList.toggle('active');
    elements.cartDrawerOverlay.classList.toggle('active');
}

function addToCart(productId) {
    const product = PNEUS_DATA.find(p => p.id === productId);
    if (!product) return;
    
    const cartItem = state.cart.find(item => item.product.id === productId);
    if (cartItem) {
        cartItem.quantity += 1;
    } else {
        state.cart.push({ product, quantity: 1 });
    }
    
    updateCartUI();
    // Auto-open cart for premium UX feedback
    if (!elements.cartDrawer.classList.contains('active')) {
        toggleCart();
    }
}

function updateCartItemQty(productId, amount) {
    const cartItem = state.cart.find(item => item.product.id === productId);
    if (!cartItem) return;
    
    cartItem.quantity += amount;
    if (cartItem.quantity <= 0) {
        state.cart = state.cart.filter(item => item.product.id !== productId);
    }
    
    updateCartUI();
}

function removeFromCart(productId) {
    state.cart = state.cart.filter(item => item.product.id !== productId);
    updateCartUI();
}

function updateCartUI() {
    // Persist to localStorage for multi-page integration
    localStorage.setItem('pneu_outlet_cart', JSON.stringify(state.cart));

    // 1. Badge count
    const totalItems = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    elements.cartBadgeCount.textContent = totalItems;
    
    // 2. Render Items
    if (state.cart.length === 0) {
        elements.cartItemsList.innerHTML = `
            <div class="cart-empty-state">
                <span class="cart-empty-icon">🛒</span>
                <p>Seu carrinho está vazio.</p>
                <p class="font-small text-muted">Que tal encontrar a medida perfeita para seu carro?</p>
            </div>
        `;
        // Hide summary footer values
        elements.cartSubtotalSemDesconto.textContent = "R$ 0,00";
        elements.cartDiscountSavings.textContent = "-R$ 0,00";
        elements.cartTotalPayable.textContent = "R$ 0,00";
        elements.cartPixPrice.textContent = "R$ 0,00";
        elements.checkoutBtn.disabled = true;
        elements.checkoutBtn.style.opacity = 0.5;
        return;
    }
    
    elements.checkoutBtn.disabled = false;
    elements.checkoutBtn.style.opacity = 1;

    let subtotalOriginal = 0;
    let subtotalOutlet = 0;
    
    elements.cartItemsList.innerHTML = state.cart.map(item => {
        const qty = item.quantity;
        let extraDiscountPercent = 0;
        let discountBadge = "";
        
        if (qty >= 4) {
            extraDiscountPercent = 30;
            discountBadge = `<span class="discount-badge-qty">+30% OFF Jogo</span>`;
        } else if (qty >= 2) {
            extraDiscountPercent = 15;
            discountBadge = `<span class="discount-badge-qty">+15% OFF Par</span>`;
        }
        
        const itemOriginalTotal = item.product.originalPrice * qty;
        const baseOutletTotal = item.product.outletPrice * qty;
        const itemOutletTotal = baseOutletTotal * (1 - (extraDiscountPercent / 100));
        
        subtotalOriginal += itemOriginalTotal;
        subtotalOutlet += itemOutletTotal;
        
        return `
            <div class="cart-item">
                <div class="cart-item-img-box">
                    <img class="cart-item-img" src="${item.product.image}" alt="${item.product.brand} ${item.product.model}">
                </div>
                <div class="cart-item-details">
                    <span class="cart-item-name">${item.product.brand} ${item.product.model}</span>
                    <span class="cart-item-spec">${item.product.width}/${item.product.profile} R${item.product.rim} ${discountBadge}</span>
                    <div class="cart-qty-controls">
                        <button class="btn-qty" onclick="updateCartItemQty(${item.product.id}, -1)">-</button>
                        <span class="qty-val">${item.quantity}</span>
                        <button class="btn-qty" onclick="updateCartItemQty(${item.product.id}, 1)">+</button>
                    </div>
                </div>
                <div class="cart-item-pricing">
                    <span class="cart-item-price">R$ ${itemOutletTotal.toFixed(2)}</span>
                    <span class="cart-item-orig-price">R$ ${itemOriginalTotal.toFixed(2)}</span>
                </div>
                <button class="btn-remove-item" onclick="removeFromCart(${item.product.id})" aria-label="Remover item">&times;</button>
            </div>
        `;
    }).join('');
    
    // 3. Totals
    const savings = subtotalOriginal - subtotalOutlet;
    const pixTotal = subtotalOutlet * 0.9; // 10% OFF for Pix
    
    elements.cartSubtotalSemDesconto.textContent = `R$ ${subtotalOriginal.toFixed(2)}`;
    elements.cartDiscountSavings.textContent = `-R$ ${savings.toFixed(2)}`;
    elements.cartTotalPayable.textContent = `R$ ${subtotalOutlet.toFixed(2)}`;
    elements.cartPixPrice.textContent = `R$ ${pixTotal.toFixed(2)}`;
}

// Global functions exposed to window so onclick inline handlers work
window.updateCartItemQty = updateCartItemQty;
window.removeFromCart = removeFromCart;
window.addToCart = addToCart;
window.openDetails = openDetails;

// --- PRODUCT DETAILS MODAL ---
function toggleModal() {
    elements.productModal.classList.toggle('active');
    elements.productModalOverlay.classList.toggle('active');
}

function openDetails(productId) {
    const product = PNEUS_DATA.find(p => p.id === productId);
    if (!product) return;
    
    const savingPercent = Math.round(((product.originalPrice - product.outletPrice) / product.originalPrice) * 100);
    
    elements.modalProductDetails.innerHTML = `
        <div class="modal-product-layout">
            <div class="modal-img-container">
                <img class="modal-img" src="${product.image}" alt="${product.brand} ${product.model}">
            </div>
            
            <div class="modal-details">
                <span class="modal-brand">${product.brand}</span>
                <h2>${product.model}</h2>
                <span class="product-specs" style="margin-bottom: 1rem;">
                    ${product.width}/${product.profile} R${product.rim} ${product.loadIndex}${product.speedRating}
                </span>
                
                <p class="modal-description">${product.description}</p>
                
                <!-- Especificações Técnicas -->
                <table class="specs-table">
                    <tr>
                        <td>Largura</td>
                        <td>${product.width} mm</td>
                    </tr>
                    <tr>
                        <td>Perfil</td>
                        <td>${product.profile} %</td>
                    </tr>
                    <tr>
                        <td>Aro</td>
                        <td>${product.rim}"</td>
                    </tr>
                    <tr>
                        <td>Índice de Carga</td>
                        <td>${product.loadIndex} (${product.loadIndex * 4 + 300} kg/pneu aprox.)</td>
                    </tr>
                    <tr>
                        <td>Índice de Velocidade</td>
                        <td>${product.speedRating} (Até ${product.speedRating === 'Y' ? '300' : product.speedRating === 'V' ? '240' : product.speedRating === 'H' ? '210' : '190'} km/h)</td>
                    </tr>
                    <tr>
                        <td>Tipo de Veículo</td>
                        <td>${product.vehicle}</td>
                    </tr>
                </table>

                <!-- Etiqueta de Pneu da União Europeia (Simulada para UX Premium) -->
                <div class="tire-label-container">
                    <div class="tire-label-header">
                        <span>ETIQUETA DE EFICIÊNCIA</span>
                        <span>CONFORME INMETRO / UE</span>
                    </div>
                    <div class="tire-label-ratings">
                        <div class="label-rating-box">
                            <span class="label-icon">⛽</span>
                            <span class="label-title">Consumo</span>
                            <span class="label-value class-${product.fuelEfficiency.toLowerCase()}">${product.fuelEfficiency}</span>
                        </div>
                        <div class="label-rating-box">
                            <span class="label-icon">🌧️</span>
                            <span class="label-title">Aderência</span>
                            <span class="label-value class-${product.wetGrip.toLowerCase()}">${product.wetGrip}</span>
                        </div>
                        <div class="label-rating-box">
                            <span class="label-icon">🔊</span>
                            <span class="label-title">Ruído</span>
                            <span class="label-value" style="color: black;">${product.noiseLevel} dB</span>
                        </div>
                    </div>
                </div>

                <!-- Preços e Botões -->
                <div class="product-price-box">
                    <span class="price-original">De R$ ${product.originalPrice.toFixed(2)}</span>
                    <div class="price-outlet" style="font-size: 2rem; margin-bottom: 0.5rem;">
                        <span class="price-currency">R$</span> ${product.outletPrice.toFixed(2)}
                        <span class="outlet-badge" style="position: static; margin-left: 1rem;">${savingPercent}% OFF</span>
                    </div>
                    <span class="price-installments" style="display: block; margin-bottom: 1rem;">Em até 12x de R$ ${(product.outletPrice / 12).toFixed(2)} sem juros</span>
                </div>

                <div class="progressive-discount-info">
                    <span>💡 <strong>Desconto Progressivo:</strong> Peça o <strong>Par (+15% OFF)</strong> ou o <strong>Jogo (+30% OFF)</strong> e economize ainda mais no carrinho!</span>
                </div>
                
                <div style="display: flex; gap: 1rem;">
                    <button class="btn-primary" onclick="addToCart(${product.id}); toggleModal();" style="flex-grow: 1;">Adicionar ao Carrinho</button>
                    <button class="btn-secondary" onclick="toggleModal();">Voltar</button>
                </div>
            </div>
        </div>
    `;
    
    toggleModal();
}

// --- CATALOG RENDERING & FILTERING ---
function renderCatalog() {
    // 1. Filtering
    let filteredPneus = PNEUS_DATA.filter(pneu => {
        // Search text matching model or brand
        if (state.filters.search) {
            const query = state.filters.search.toLowerCase();
            const matchesSearch = pneu.brand.toLowerCase().includes(query) || 
                                  pneu.model.toLowerCase().includes(query) || 
                                  pneu.description.toLowerCase().includes(query) || 
                                  `${pneu.width}/${pneu.profile} r${pneu.rim}`.toLowerCase().includes(query) ||
                                  `${pneu.width}/${pneu.profile}`.toLowerCase().includes(query);
            if (!matchesSearch) return false;
        }
        
        // Vehicle type filter
        if (state.filters.vehicle && pneu.vehicle !== state.filters.vehicle) {
            return false;
        }
        
        // Width filter
        if (state.filters.width && pneu.width !== parseInt(state.filters.width)) {
            return false;
        }
        
        // Profile filter
        if (state.filters.profile && pneu.profile !== parseInt(state.filters.profile)) {
            return false;
        }
        
        // Rim filter
        if (state.filters.rim && pneu.rim !== parseInt(state.filters.rim)) {
            return false;
        }
        
        // Brand filter
        if (state.filters.brand && pneu.brand !== state.filters.brand) {
            return false;
        }
        
        return true;
    });

    // 2. Sorting
    filteredPneus.sort((a, b) => {
        if (state.sortBy === 'discount') {
            const discA = (a.originalPrice - a.outletPrice) / a.originalPrice;
            const discB = (b.originalPrice - b.outletPrice) / b.originalPrice;
            return discB - discA; // high discount first
        }
        if (state.sortBy === 'price-asc') {
            return a.outletPrice - b.outletPrice;
        }
        if (state.sortBy === 'price-desc') {
            return b.outletPrice - a.outletPrice;
        }
        if (state.sortBy === 'brand') {
            return a.brand.localeCompare(b.brand);
        }
        return 0;
    });

    // 3. UI update for results count
    const totalCount = filteredPneus.length;
    if (totalCount === 0) {
        elements.resultsCount.textContent = "0 pneus encontrados";
        elements.productsGrid.classList.add('hidden');
        elements.noResults.classList.remove('hidden');
        return;
    }

    elements.resultsCount.textContent = `${totalCount} ${totalCount === 1 ? 'pneu encontrado' : 'pneus encontrados'}`;
    elements.productsGrid.classList.remove('hidden');
    elements.noResults.classList.add('hidden');

    // 4. Render Grid Cards
    elements.productsGrid.innerHTML = filteredPneus.map(pneu => {
        const discountPct = Math.round(((pneu.originalPrice - pneu.outletPrice) / pneu.originalPrice) * 100);
        return `
            <article class="product-card">
                <span class="outlet-badge">${discountPct}% OFF</span>
                <span class="vehicle-tag">${pneu.vehicle}</span>
                
                <div class="product-image-container">
                    <img class="product-image" src="${pneu.image}" alt="${pneu.brand} ${pneu.model}">
                </div>
                
                <div class="product-info">
                    <span class="product-brand">${pneu.brand}</span>
                    <h3 class="product-name">${pneu.model}</h3>
                    
                    <div class="product-specs-box">
                        <span class="product-specs">${pneu.width}/${pneu.profile} R${pneu.rim} ${pneu.loadIndex}${pneu.speedRating}</span>
                    </div>
                    
                    <div class="product-price-box">
                        <span class="price-original">R$ ${pneu.originalPrice.toFixed(2)}</span>
                        <div class="price-outlet">
                            <span class="price-currency">R$</span>${pneu.outletPrice.toFixed(2)}
                        </div>
                        <span class="price-installments">12x de R$ ${(pneu.outletPrice / 12).toFixed(2)} sem juros</span>
                    </div>
                    
                    <div class="product-actions">
                        <button class="btn-add-cart" onclick="addToCart(${pneu.id})">Comprar</button>
                        <button class="btn-detail" onclick="openDetails(${pneu.id})" aria-label="Ver especificações detalhadas">
                            <svg class="detail-eye-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </article>
        `;
    }).join('');
}

// --- INIT APP ---
function init() {
    initEventListeners();
    renderCatalog();
    updateCartUI();
}

// Start application when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
