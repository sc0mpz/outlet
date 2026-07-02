import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json({ limit: '50kb' })); // limita tamanho do payload

// --- SUPABASE CONFIGURATION ---
// Aceita tanto VITE_SUPABASE_URL quanto SUPABASE_URL
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

const isSupabaseConfigured = 
    Boolean(supabaseUrl) && 
    Boolean(supabaseKey) && 
    !supabaseUrl.includes('placeholder') && 
    !supabaseKey.includes('placeholder');

let supabaseClient = null;

if (isSupabaseConfigured) {
    try {
        supabaseClient = createClient(supabaseUrl, supabaseKey);
        console.log("⚡ [Express] Conectado ao Supabase com sucesso!");
    } catch (err) {
        console.error("Erro ao inicializar cliente do Supabase no Express:", err);
    }
} else {
    console.warn("⚠️ [Express] Supabase não configurado. Utilizando fallback local (db.json).");
}

// --- LOCAL JSON DATABASE CONFIGURATION ---
const DB_FILE = path.join(process.cwd(), 'db.json');

// --- CARREGA O CATÁLOGO DE PRODUTOS PARA VALIDAÇÃO ---
const CATALOG_FILE = path.join(process.cwd(), 'products_catalog.json');
let productsCatalog = [];
try {
    if (fs.existsSync(CATALOG_FILE)) {
        const rawCatalog = fs.readFileSync(CATALOG_FILE, 'utf-8');
        productsCatalog = JSON.parse(rawCatalog || '[]');
        console.log(`📦 [Express] Catálogo de produtos carregado: ${productsCatalog.length} itens.`);
    } else {
        console.warn("⚠️ [Express] Arquivo products_catalog.json não encontrado. Validação de preços indisponível!");
    }
} catch (err) {
    console.error("Erro ao carregar catálogo de produtos:", err);
}

function readDb() {
    if (!fs.existsSync(DB_FILE)) {
        return { orders: [], profiles: [] };
    }
    try {
        const data = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(data || '{"orders":[],"profiles":[]}');
    } catch (err) {
        console.error("Erro ao ler db.json:", err);
        return { orders: [], profiles: [] };
    }
}

function writeDb(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
        console.error("Erro ao gravar db.json:", err);
    }
}

// --- NUVIONPAY CONFIGURATION ---
const nuvionPublicKey = (process.env.NUVIONPAY_PUBLIC_KEY || '').trim();
let nuvionSecretKey = (process.env.NUVIONPAY_SECRET_KEY || '').trim();

// Correção automática de erro comum de digitação/cópia (ssk_ ao invés de sk_)
if (nuvionSecretKey.startsWith('ssk_')) {
    nuvionSecretKey = 'sk_' + nuvionSecretKey.substring(4);
}

const isNuvionPayConfigured = Boolean(nuvionPublicKey) && 
                              Boolean(nuvionSecretKey) && 
                              !nuvionPublicKey.includes('seu_token_publico_aqui') &&
                              !nuvionSecretKey.includes('seu_token_secreto_aqui');

// --- ROUTES ---

// 1. Rota de Checkout (Cria transação e salva pedido)
app.post('/api/checkout', async (req, res) => {
    const { payload, user_id } = req.body;
    console.log("🛒 Requisição de Checkout recebida:", payload);

    // Validação de entrada básica
    if (!payload || !Array.isArray(payload.cart) || !payload.customer) {
        return res.status(400).json({ success: false, error: "Payload inválido. Dados incompletos." });
    }

    // --- RECALCULO E VALIDAÇÃO DE PREÇOS NO BACKEND (MELHORIA 1) ---
    let calculatedAmount = 0;
    let validatedItems = [];

    try {
        for (const item of payload.cart) {
            const catalogProduct = productsCatalog.find(p => p.id === Number(item.id));
            if (!catalogProduct) {
                return res.status(400).json({ 
                    success: false, 
                    error: `Produto com ID ${item.id} não foi encontrado no catálogo oficial.` 
                });
            }

            // Descontos por quantidade: 2+ unidades = 15%, 4+ unidades = 30%
            const qty = Number(item.quantity) || 1;
            let discountPercent = 0;
            if (qty >= 4) discountPercent = 30;
            else if (qty >= 2) discountPercent = 15;

            const basePrice = catalogProduct.outletPrice;
            const finalItemPrice = basePrice * (1 - (discountPercent / 100));
            const calculatedUnitPriceCents = Math.round(finalItemPrice * 100);

            calculatedAmount += calculatedUnitPriceCents * qty;

            validatedItems.push({
                title: `${catalogProduct.brand} ${catalogProduct.model} (${catalogProduct.width}/${catalogProduct.profile} R${catalogProduct.rim})`,
                unitPrice: calculatedUnitPriceCents,
                quantity: qty,
                tangible: item.tangible !== undefined ? item.tangible : true,
                externalRef: String(catalogProduct.id)
            });
        }
    } catch (err) {
        console.error("Erro na validação de preços do carrinho:", err);
        return res.status(500).json({ success: false, error: "Erro interno ao processar valores do carrinho." });
    }

    if (isNuvionPayConfigured) {
        try {
            const auth = 'Basic ' + Buffer.from(nuvionPublicKey + ':' + nuvionSecretKey).toString('base64');

            // Mapeia endereço em camelCase conforme exigido pela NuvionPay
            const customerAddress = {
                street: payload.customer.street_name,
                streetNumber: payload.customer.number,
                complement: payload.customer.complement || '',
                zipCode: payload.customer.zip_code,
                neighborhood: payload.customer.neighborhood,
                city: payload.customer.city,
                state: payload.customer.state,
                country: 'BR'
            };

            const nuvionPayload = {
                amount: calculatedAmount, // Total recalculado no backend
                paymentMethod: 'pix',
                pix: {
                    expiresInDays: payload.expire_in_days || 1
                },
                items: validatedItems, // Itens e preços reais validados no backend
                customer: {
                    name: payload.customer.name,
                    email: payload.customer.email,
                    phone: payload.customer.phone_number,
                    document: {
                        type: 'cpf',
                        number: payload.customer.document
                    },
                    address: customerAddress
                },
                externalRef: "order_" + Math.floor(100000 + Math.random() * 900000)
            };

            // Envia a requisição de pagamento para a NuvionPay
            const response = await fetch(`https://api.nuvionpay.com.br/v1/transactions`, {
                method: "POST",
                headers: {
                    "Authorization": auth,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(nuvionPayload)
            });

            const resData = await response.json();

            // Suporta propriedades na raiz ou envelopadas em 'data'
            const transactionObj = resData.data || resData;
            const transactionId = transactionObj.id ? String(transactionObj.id) : null;

            if (!response.ok || !transactionId) {
                return res.status(response.status).json({
                    success: false,
                    error: resData.message || resData.error || "Erro na API da NuvionPay",
                    errors: resData.errors
                });
            }

            const qrCode = transactionObj.pix ? (transactionObj.pix.qrcode || transactionObj.pix.pix_qr_code) : '';

            // Formata o retorno para compatibilidade com o frontend
            const mappedResponse = {
                success: true,
                hash: transactionId,
                payment_status: "waiting_payment",
                pix: {
                    pix_qr_code: qrCode,
                    pix_url: transactionObj.secureUrl || ''
                }
            };

            // Salva pedido no banco
            const dbPayload = {
                amount: calculatedAmount,
                customer: payload.customer,
                cart: validatedItems.map(item => ({
                    product_hash: item.externalRef,
                    title: item.title,
                    price: item.unitPrice,
                    quantity: item.quantity
                }))
            };

            await saveOrderToDb({ hash: transactionId }, dbPayload, user_id, "waiting_payment");

            return res.json(mappedResponse);
        } catch (error) {
            console.error("Erro ao processar com NuvionPay:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
    } else {
        // Modo simulação local (offline)
        console.log("🟡 Executando checkout simulado (Modo Offline)");
        const mockHash = "mock_" + Math.floor(100000 + Math.random() * 900000);
        const mockResponse = {
            success: true,
            hash: mockHash,
            payment_status: "waiting_payment",
            pix: {
                pix_qr_code: `00020101021226870014br.gov.bcb.pix2565pix.pneuoutlet.com.br/gateway/transacao_${mockHash}`,
                pix_url: `https://pix.pneuoutlet.com.br/mock/${mockHash}`
            }
        };

        const dbPayload = {
            amount: calculatedAmount,
            customer: payload.customer,
            cart: validatedItems.map(item => ({
                product_hash: item.externalRef,
                title: item.title,
                price: item.unitPrice,
                quantity: item.quantity
            }))
        };

        await saveOrderToDb({ hash: mockHash }, dbPayload, user_id, "waiting_payment");

        // Simula auto-aprovação do Pix após 10 segundos no backend
        setTimeout(async () => {
            console.log(`⚡ [Simulação Backend] Pedido ${mockHash} pago via Pix.`);
            await updateOrderStatusInDb(mockHash, "paid");
        }, 10000);

        return res.json(mockResponse);
    }
});

// 2. Consulta de Pedido (Com Sincronização Ativa - MELHORIA 3)
app.get('/api/orders/:hash', async (req, res) => {
    const { hash } = req.params;

    try {
        let order = null;

        if (supabaseClient) {
            const { data, error } = await supabaseClient
                .from('orders')
                .select('*')
                .eq('transaction_hash', hash)
                .single();

            if (!error && data) {
                order = data;
            }
        } else {
            const db = readDb();
            const localOrder = db.orders.find(o => o.transaction_hash === hash);
            if (localOrder) {
                order = localOrder;
            }
        }

        if (!order) {
            return res.status(404).json({ success: false, error: "Pedido não encontrado." });
        }

        // Se o status local for "waiting_payment" e for transação real da NuvionPay, consulta a API para sincronizar
        if (order.status === "waiting_payment" && isNuvionPayConfigured && !hash.startsWith("mock_")) {
            try {
                console.log(`🔄 Sincronizando status ativo com NuvionPay para o pedido ${hash}...`);
                const auth = 'Basic ' + Buffer.from(nuvionPublicKey + ':' + nuvionSecretKey).toString('base64');
                const response = await fetch(`https://api.nuvionpay.com.br/v1/transactions/${hash}`, {
                    method: "GET",
                    headers: {
                        "Authorization": auth
                    }
                });

                if (response.ok) {
                    const resData = await response.json();
                    const apiTransaction = resData.data || resData;
                    
                    let verifiedStatus = "waiting_payment";
                    if (apiTransaction.status === "paid" || apiTransaction.status === "approved") {
                        verifiedStatus = "paid";
                    } else if (apiTransaction.status === "cancelled" || apiTransaction.status === "refused") {
                        verifiedStatus = "canceled";
                    } else if (apiTransaction.status === "refunded") {
                        verifiedStatus = "refunded";
                    }

                    if (verifiedStatus !== order.status) {
                        console.log(`⚡ Sincronização Ativa: Status atualizado de '${order.status}' para '${verifiedStatus}'`);
                        await updateOrderStatusInDb(hash, verifiedStatus);
                        order.status = verifiedStatus; // Atualiza objeto de retorno
                    }
                }
            } catch (syncErr) {
                console.error(`Erro ao sincronizar status do pedido ${hash}:`, syncErr);
            }
        }

        return res.json({ success: true, payment_status: order.status, order: order });
    } catch (err) {
        console.error("Erro ao obter pedido:", err);
        return res.status(500).json({ success: false, error: err.message });
    }
});

// 3. Webhook de Transação da NuvionPay (Postback de Produção com Validação - MELHORIA 2)
app.post('/api/webhook-nuvionpay', async (req, res) => {
    const transaction = req.body;
    console.log("📨 Webhook da NuvionPay recebido:", transaction);

    // Suporta propriedades na raiz ou envelopadas em 'data'
    const data = transaction.data || transaction;
    const transactionId = data.id ? String(data.id) : null;
    const status = data.status;

    if (!transactionId || !status) {
        return res.status(400).json({ success: false, error: "Payload inválido. Falta id ou status." });
    }

    const hash = transactionId;
    let paymentStatus = "waiting_payment";
    
    if (status === "paid" || status === "approved") {
        paymentStatus = "paid";
    } else if (status === "cancelled" || status === "refused") {
        paymentStatus = "canceled";
    } else if (status === "refunded") {
        paymentStatus = "refunded";
    }

    // Validação ativa contra a API da NuvionPay para evitar webhook falso
    if (isNuvionPayConfigured && !hash.startsWith("mock_")) {
        try {
            console.log(`🔍 Verificando legitimidade do webhook para transação ${hash}...`);
            const auth = 'Basic ' + Buffer.from(nuvionPublicKey + ':' + nuvionSecretKey).toString('base64');
            const response = await fetch(`https://api.nuvionpay.com.br/v1/transactions/${hash}`, {
                method: "GET",
                headers: {
                    "Authorization": auth
                }
            });

            if (!response.ok) {
                console.error(`❌ Falha na verificação de webhook. API NuvionPay retornou HTTP ${response.status}`);
                return res.status(400).json({ success: false, error: "Transação não encontrada na NuvionPay." });
            }

            const resData = await response.json();
            const apiTransaction = resData.data || resData;
            
            // Verifica se o status retornado pela API real confere com o webhook
            let verifiedStatus = "waiting_payment";
            if (apiTransaction.status === "paid" || apiTransaction.status === "approved") {
                verifiedStatus = "paid";
            } else if (apiTransaction.status === "cancelled" || apiTransaction.status === "refused") {
                verifiedStatus = "canceled";
            } else if (apiTransaction.status === "refunded") {
                verifiedStatus = "refunded";
            }

            if (verifiedStatus !== paymentStatus) {
                console.warn(`⚠️ Divergência detectada no webhook do pedido ${hash}. Status Webhook: ${paymentStatus}, Status Real API: ${verifiedStatus}`);
                paymentStatus = verifiedStatus; // Atualiza com o status real e seguro da API
            }
            console.log(`✅ Webhook para transação ${hash} validado com sucesso na NuvionPay.`);
        } catch (error) {
            console.error(`❌ Erro ao validar transação ${hash} com API da NuvionPay:`, error);
            return res.status(500).json({ success: false, error: "Erro de comunicação ao verificar transação." });
        }
    }

    try {
        await updateOrderStatusInDb(hash, paymentStatus);
        res.json({ success: true });
    } catch (err) {
        console.error("Erro ao processar webhook no banco:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- DATABASE HELPERS ---
async function saveOrderToDb(transaction, payload, user_id, paymentStatus) {
    const orderData = {
        transaction_hash: transaction.hash,
        amount: parseFloat((payload.amount / 100).toFixed(2)),
        status: paymentStatus,
        items: payload.cart.map(item => ({
            product_hash: item.product_hash,
            title: item.title,
            price: parseFloat((item.price / 100).toFixed(2)),
            quantity: item.quantity
        })),
        shipping_address: {
            cep: payload.customer.zip_code,
            street: payload.customer.street_name,
            number: payload.customer.number,
            complement: payload.customer.complement,
            neighborhood: payload.customer.neighborhood,
            city: payload.customer.city,
            state: payload.customer.state
        }
    };

    if (supabaseClient && user_id) {
        orderData.user_id = user_id;
        try {
            const { data, error } = await supabaseClient
                .from('orders')
                .insert(orderData)
                .select();
            if (error) throw error;
            console.log("💾 Pedido gravado no Supabase:", data[0]?.id);
        } catch (err) {
            console.error("Erro ao salvar pedido no Supabase:", err);
        }
    } else {
        // Fallback local db.json
        const db = readDb();
        orderData.user_id = user_id || 'guest';
        orderData.created_at = new Date().toISOString();
        db.orders.push(orderData);
        writeDb(db);
        console.log("💾 Pedido gravado no db.json:", orderData.transaction_hash);
    }
}

async function updateOrderStatusInDb(hash, status) {
    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from('orders')
                .update({ status: status })
                .eq('transaction_hash', hash);
            if (error) throw error;
            console.log(`💾 Status do pedido ${hash} atualizado para '${status}' no Supabase`);
        } catch (err) {
            console.error("Erro ao atualizar status do pedido no Supabase:", err);
        }
    } else {
        // Fallback local db.json
        const db = readDb();
        const order = db.orders.find(o => o.transaction_hash === hash);
        if (order) {
            order.status = status;
            writeDb(db);
            console.log(`💾 Status do pedido ${hash} atualizado para '${status}' no db.json`);
        } else {
            console.warn(`⚠️ Pedido ${hash} não encontrado no db.json para atualização.`);
        }
    }
}

// Inicia o Servidor Express apenas se rodar diretamente (não na Vercel Serverless)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    const server = app.listen(PORT, () => {
        console.log(`🚀 Servidor Express Backend rodando em http://localhost:${PORT}`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`\n❌ ERRO: Porta ${PORT} já está em uso por outro processo.`);
            console.error(`   Execute: netstat -ano | findstr :${PORT}`);
            console.error(`   E depois: taskkill /PID <PID> /F\n`);
        } else {
            console.error('Erro no servidor:', err);
        }
        process.exit(1);
    });
}

export default app;
