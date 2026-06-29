-- HABILITA A EXTENSÃO DE UUID SE JÁ NÃO ESTIVER HABILITADA
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- TABELA DE PERFIS DE USUÁRIOS (LIGADA AO AUTH.USERS DO SUPABASE)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    cpf TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- TABELA DE PEDIDOS (ORDERS)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    transaction_hash TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'waiting_payment',
    items JSONB NOT NULL,
    shipping_address JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- HABILITAR SEGURANÇA EM NÍVEL DE LINHA (RLS - ROW LEVEL SECURITY)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS PARA A TABELA DE PERFIS
CREATE POLICY "Permitir inserção pelo próprio usuário" 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Permitir leitura pelo próprio usuário" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Permitir atualização pelo próprio usuário" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

-- POLÍTICAS PARA A TABELA DE PEDIDOS
CREATE POLICY "Permitir inserção de pedidos pelo próprio usuário" 
    ON public.orders FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Permitir leitura de pedidos pelo próprio usuário" 
    ON public.orders FOR SELECT 
    USING (auth.uid() = user_id);
