-- E-commerce Demo Database Seed Data
-- Brazilian SaaS E-commerce initial data

-- ================================================
-- Categories (30+ hierarchical categories)
-- ================================================
INSERT INTO categories (name, slug, description, parent_id, is_active, sort_order) VALUES
-- Root categories
('Eletrônicos', 'eletronicos', 'Produtos eletrônicos e tecnologia', NULL, true, 1),
('Moda', 'moda', 'Roupas, calçados e acessórios', NULL, true, 2),
('Casa e Decoração', 'casa-decoracao', 'Móveis, decoração e utilidades domésticas', NULL, true, 3),
('Esportes', 'esportes', 'Artigos esportivos e fitness', NULL, true, 4),
('Beleza', 'beleza', 'Cosméticos, perfumes e cuidados pessoais', NULL, true, 5),
('Livros', 'livros', 'Livros físicos e e-books', NULL, true, 6),
('Brinquedos', 'brinquedos', 'Brinquedos e jogos para todas as idades', NULL, true, 7),
('Automotivo', 'automotivo', 'Peças, acessórios e ferramentas automotivas', NULL, true, 8);

-- Subcategories - Eletrônicos
INSERT INTO categories (name, slug, description, parent_id, is_active, sort_order) VALUES
('Smartphones', 'smartphones', 'Celulares e smartphones', 1, true, 1),
('Notebooks', 'notebooks', 'Notebooks e laptops', 1, true, 2),
('Tablets', 'tablets', 'Tablets e e-readers', 1, true, 3),
('TVs', 'tvs', 'Televisores e Smart TVs', 1, true, 4),
('Áudio', 'audio', 'Fones, caixas de som e equipamentos de áudio', 1, true, 5),
('Câmeras', 'cameras', 'Câmeras fotográficas e filmadoras', 1, true, 6),
('Games', 'games', 'Consoles e acessórios para games', 1, true, 7),
('Acessórios Tech', 'acessorios-tech', 'Capas, cabos, carregadores e mais', 1, true, 8);

-- Subcategories - Moda
INSERT INTO categories (name, slug, description, parent_id, is_active, sort_order) VALUES
('Moda Masculina', 'moda-masculina', 'Roupas masculinas', 2, true, 1),
('Moda Feminina', 'moda-feminina', 'Roupas femininas', 2, true, 2),
('Calçados', 'calcados', 'Sapatos, tênis e sandálias', 2, true, 3),
('Bolsas e Malas', 'bolsas-malas', 'Bolsas, mochilas e malas', 2, true, 4),
('Relógios', 'relogios', 'Relógios de pulso', 2, true, 5),
('Óculos', 'oculos', 'Óculos de sol e grau', 2, true, 6);

-- Subcategories - Casa e Decoração
INSERT INTO categories (name, slug, description, parent_id, is_active, sort_order) VALUES
('Móveis', 'moveis', 'Sofás, mesas, cadeiras e armários', 3, true, 1),
('Cama, Mesa e Banho', 'cama-mesa-banho', 'Roupas de cama, toalhas e mais', 3, true, 2),
('Cozinha', 'cozinha', 'Eletrodomésticos e utensílios de cozinha', 3, true, 3),
('Decoração', 'decoracao', 'Quadros, vasos, almofadas e objetos decorativos', 3, true, 4),
('Iluminação', 'iluminacao', 'Luminárias, lustres e lâmpadas', 3, true, 5);

-- Subcategories - Esportes
INSERT INTO categories (name, slug, description, parent_id, is_active, sort_order) VALUES
('Fitness', 'fitness', 'Equipamentos e acessórios para academia', 4, true, 1),
('Futebol', 'futebol', 'Bolas, chuteiras e uniformes', 4, true, 2),
('Ciclismo', 'ciclismo', 'Bicicletas e acessórios', 4, true, 3),
('Natação', 'natacao', 'Óculos, maiôs e acessórios', 4, true, 4),
('Camping', 'camping', 'Barracas, mochilas e equipamentos outdoor', 4, true, 5);

-- ================================================
-- Coupons (20 active coupons)
-- ================================================
INSERT INTO coupons (code, description, discount_type, discount_value, minimum_order_value, maximum_discount, usage_limit, valid_from, valid_until, is_active) VALUES
('BEMVINDO10', 'Desconto de 10% para primeira compra', 'percentage', 10.00, 100.00, 50.00, NULL, '2024-01-01', '2024-12-31', true),
('FRETEGRATIS', 'Frete grátis em compras acima de R$ 200', 'free_shipping', 0.00, 200.00, NULL, NULL, '2024-01-01', '2024-12-31', true),
('TECH20', 'Desconto de 20% em eletrônicos', 'percentage', 20.00, 500.00, 200.00, 100, '2024-01-01', '2024-06-30', true),
('MODA15', 'Desconto de 15% em moda', 'percentage', 15.00, 150.00, 100.00, 200, '2024-01-01', '2024-06-30', true),
('CASA50', 'R$ 50 OFF em Casa e Decoração', 'fixed', 50.00, 300.00, NULL, 50, '2024-01-01', '2024-03-31', true),
('ANIVERSARIO', 'Mês de aniversário - 15% OFF', 'percentage', 15.00, 0.00, 150.00, NULL, '2024-01-01', '2024-12-31', true),
('PIX5', 'Desconto extra 5% no PIX', 'percentage', 5.00, 0.00, 100.00, NULL, '2024-01-01', '2024-12-31', true),
('BLACKFRIDAY30', 'Black Friday 30% OFF', 'percentage', 30.00, 200.00, 500.00, 1000, '2024-11-20', '2024-11-30', true),
('NATAL25', 'Natal com 25% OFF', 'percentage', 25.00, 100.00, 300.00, 500, '2024-12-01', '2024-12-25', true),
('VOLTA100', 'R$ 100 OFF para cliente VIP', 'fixed', 100.00, 500.00, NULL, 10, '2024-01-01', '2024-12-31', true),
('ESPORTE10', 'Desconto de 10% em esportes', 'percentage', 10.00, 100.00, 80.00, 100, '2024-01-01', '2024-06-30', true),
('BELEZA20', 'Desconto de 20% em beleza', 'percentage', 20.00, 80.00, 60.00, 150, '2024-01-01', '2024-06-30', true),
('LIVROS15', 'Desconto de 15% em livros', 'percentage', 15.00, 50.00, 40.00, 200, '2024-01-01', '2024-12-31', true),
('GAMES25', 'Desconto de 25% em games', 'percentage', 25.00, 200.00, 150.00, 75, '2024-01-01', '2024-06-30', true),
('VERAO15', 'Promoção de Verão 15% OFF', 'percentage', 15.00, 150.00, 100.00, 300, '2024-01-01', '2024-03-20', true),
('DIADASMAES', 'Dia das Mães 20% OFF', 'percentage', 20.00, 100.00, 150.00, 400, '2024-05-01', '2024-05-12', true),
('DIADOSPAIS', 'Dia dos Pais 20% OFF', 'percentage', 20.00, 100.00, 150.00, 400, '2024-08-01', '2024-08-11', true),
('CRIANCAS10', 'Dia das Crianças 10% OFF', 'percentage', 10.00, 80.00, 80.00, 300, '2024-10-01', '2024-10-12', true),
('CYBER40', 'Cyber Monday 40% OFF', 'percentage', 40.00, 300.00, 400.00, 200, '2024-12-02', '2024-12-02', true),
('INDICACAO15', 'Desconto por indicação', 'percentage', 15.00, 100.00, 75.00, NULL, '2024-01-01', '2024-12-31', true);

-- ================================================
-- Products (50 initial products - will be expanded by seed script)
-- ================================================
INSERT INTO products (sku, name, slug, description, short_description, category_id, price, compare_at_price, cost_price, stock_quantity, low_stock_threshold, brand, is_active, is_featured, tags, images, attributes) VALUES
-- Smartphones
('SMRT-IP15-128', 'iPhone 15 128GB', 'iphone-15-128gb', 'O iPhone 15 apresenta o chip A16 Bionic, câmera de 48MP e Dynamic Island. Design elegante com acabamento em alumínio.', 'iPhone 15 com chip A16 Bionic e câmera de 48MP', 9, 5499.00, 5999.00, 4200.00, 45, 10, 'Apple', true, true, ARRAY['apple', 'iphone', 'smartphone', '5g'], '[{"url": "/products/iphone15-1.jpg", "alt": "iPhone 15 Azul"}]', '{"color": "Azul", "storage": "128GB"}'),
('SMRT-IP15-256', 'iPhone 15 256GB', 'iphone-15-256gb', 'O iPhone 15 apresenta o chip A16 Bionic, câmera de 48MP e Dynamic Island. Mais armazenamento para suas fotos e apps.', 'iPhone 15 com 256GB de armazenamento', 9, 6299.00, 6799.00, 4800.00, 30, 10, 'Apple', true, true, ARRAY['apple', 'iphone', 'smartphone', '5g'], '[{"url": "/products/iphone15-2.jpg", "alt": "iPhone 15 Preto"}]', '{"color": "Preto", "storage": "256GB"}'),
('SMRT-S24-128', 'Samsung Galaxy S24 128GB', 'samsung-galaxy-s24-128gb', 'O Galaxy S24 traz inteligência artificial avançada, câmera de 50MP e display Dynamic AMOLED 2X.', 'Galaxy S24 com IA avançada', 9, 4299.00, 4699.00, 3200.00, 55, 10, 'Samsung', true, true, ARRAY['samsung', 'galaxy', 'android', '5g'], '[{"url": "/products/s24-1.jpg", "alt": "Galaxy S24"}]', '{"color": "Violet", "storage": "128GB"}'),
('SMRT-XIR12', 'Xiaomi Redmi 12 128GB', 'xiaomi-redmi-12-128gb', 'Smartphone com excelente custo-benefício. Tela de 6.79", processador octa-core e bateria de 5000mAh.', 'Redmi 12 com ótimo custo-benefício', 9, 1199.00, 1399.00, 850.00, 120, 20, 'Xiaomi', true, false, ARRAY['xiaomi', 'redmi', 'android', 'custo-beneficio'], '[{"url": "/products/redmi12.jpg", "alt": "Redmi 12"}]', '{"color": "Sky Blue", "storage": "128GB"}'),

-- Notebooks
('NOTE-MBP14', 'MacBook Pro 14" M3', 'macbook-pro-14-m3', 'MacBook Pro com chip M3, 18GB de memória unificada e SSD de 512GB. Tela Liquid Retina XDR.', 'MacBook Pro 14" com chip M3', 10, 14999.00, 16499.00, 11500.00, 15, 5, 'Apple', true, true, ARRAY['apple', 'macbook', 'notebook', 'profissional'], '[{"url": "/products/mbp14.jpg", "alt": "MacBook Pro 14"}]', '{"chip": "M3", "ram": "18GB", "storage": "512GB SSD"}'),
('NOTE-DELL-I5', 'Dell Inspiron 15 i5', 'dell-inspiron-15-i5', 'Notebook Dell Inspiron com processador Intel Core i5, 8GB RAM e SSD de 256GB.', 'Dell Inspiron 15 com Intel Core i5', 10, 3299.00, 3799.00, 2500.00, 40, 10, 'Dell', true, false, ARRAY['dell', 'inspiron', 'notebook', 'intel'], '[{"url": "/products/dell-i15.jpg", "alt": "Dell Inspiron 15"}]', '{"processor": "Intel Core i5", "ram": "8GB", "storage": "256GB SSD"}'),
('NOTE-LENO-G3', 'Lenovo IdeaPad Gaming 3i', 'lenovo-ideapad-gaming-3i', 'Notebook gamer com Intel Core i5, RTX 3050 e tela de 15.6" Full HD 120Hz.', 'IdeaPad Gaming 3i com RTX 3050', 10, 4599.00, 5199.00, 3500.00, 25, 8, 'Lenovo', true, true, ARRAY['lenovo', 'gamer', 'notebook', 'rtx'], '[{"url": "/products/ideapad-g3.jpg", "alt": "IdeaPad Gaming 3i"}]', '{"processor": "Intel Core i5", "gpu": "RTX 3050", "ram": "8GB"}'),

-- Audio
('AUDI-APMAX', 'AirPods Max', 'airpods-max', 'Fone over-ear da Apple com cancelamento ativo de ruído, áudio espacial e até 20h de bateria.', 'AirPods Max com cancelamento de ruído', 13, 4999.00, 5499.00, 3800.00, 20, 5, 'Apple', true, true, ARRAY['apple', 'airpods', 'fone', 'premium'], '[{"url": "/products/airpods-max.jpg", "alt": "AirPods Max"}]', '{"color": "Space Gray", "type": "Over-ear"}'),
('AUDI-JBL-500', 'JBL Live 500BT', 'jbl-live-500bt', 'Fone Bluetooth JBL com som JBL Signature, até 30h de bateria e microfone embutido.', 'Fone JBL Live 500BT Wireless', 13, 499.00, 649.00, 350.00, 80, 15, 'JBL', true, false, ARRAY['jbl', 'fone', 'bluetooth', 'wireless'], '[{"url": "/products/jbl-500.jpg", "alt": "JBL Live 500BT"}]', '{"color": "Black", "battery": "30h"}'),
('AUDI-SONO-ONE', 'Sonos One SL', 'sonos-one-sl', 'Caixa de som inteligente com som rico e graves profundos. Compatível com AirPlay 2.', 'Sonos One SL - Speaker Inteligente', 13, 1899.00, 2199.00, 1400.00, 25, 8, 'Sonos', true, false, ARRAY['sonos', 'speaker', 'smart', 'airplay'], '[{"url": "/products/sonos-one.jpg", "alt": "Sonos One SL"}]', '{"color": "White", "connectivity": "WiFi, AirPlay 2"}'),

-- Games
('GAME-PS5-STD', 'PlayStation 5 Standard', 'playstation-5-standard', 'Console PlayStation 5 com leitor de disco. Inclui controle DualSense e jogos Astro Bot.', 'PS5 Standard com leitor de disco', 15, 4499.00, 4999.00, 3600.00, 30, 10, 'Sony', true, true, ARRAY['sony', 'playstation', 'ps5', 'console'], '[{"url": "/products/ps5.jpg", "alt": "PlayStation 5"}]', '{"edition": "Standard", "storage": "825GB SSD"}'),
('GAME-XSX', 'Xbox Series X', 'xbox-series-x', 'Console Xbox Series X com 1TB de armazenamento e suporte a 4K/120fps.', 'Xbox Series X 1TB', 15, 4199.00, 4599.00, 3400.00, 25, 8, 'Microsoft', true, true, ARRAY['microsoft', 'xbox', 'console', '4k'], '[{"url": "/products/xsx.jpg", "alt": "Xbox Series X"}]', '{"storage": "1TB SSD", "resolution": "4K/120fps"}'),
('GAME-NSW-OLED', 'Nintendo Switch OLED', 'nintendo-switch-oled', 'Nintendo Switch versão OLED com tela de 7", dock com porta ethernet e 64GB internos.', 'Switch OLED com tela de 7"', 15, 2499.00, 2799.00, 1900.00, 40, 10, 'Nintendo', true, true, ARRAY['nintendo', 'switch', 'console', 'portatil'], '[{"url": "/products/switch-oled.jpg", "alt": "Nintendo Switch OLED"}]', '{"color": "Neon", "storage": "64GB"}'),

-- Moda Masculina
('MODA-POLO-M', 'Polo Ralph Lauren Masculina', 'polo-ralph-lauren-masculina', 'Camisa polo clássica Ralph Lauren em algodão pima. Corte regular fit.', 'Polo Ralph Lauren Classic Fit', 17, 459.00, 549.00, 280.00, 60, 15, 'Ralph Lauren', true, false, ARRAY['ralph lauren', 'polo', 'masculino', 'classico'], '[{"url": "/products/polo-rl.jpg", "alt": "Polo Ralph Lauren"}]', '{"size": "M", "color": "Navy Blue", "material": "Algodão Pima"}'),
('MODA-JEANS-LV', 'Calça Jeans Levi''s 501', 'calca-jeans-levis-501', 'Calça jeans icônica Levi''s 501 Original Fit. Lavagem clássica stonewash.', 'Levi''s 501 Original Fit', 17, 389.00, 459.00, 220.00, 45, 10, 'Levi''s', true, false, ARRAY['levis', 'jeans', 'masculino', '501'], '[{"url": "/products/levis-501.jpg", "alt": "Levi''s 501"}]', '{"size": "42", "color": "Stonewash", "fit": "Original"}'),

-- Moda Feminina
('MODA-VES-ZAR', 'Vestido Midi Zara', 'vestido-midi-zara', 'Vestido midi elegante em tecido fluido. Estampa floral exclusiva para a estação.', 'Vestido Midi Floral Zara', 18, 299.00, 359.00, 150.00, 35, 10, 'Zara', true, true, ARRAY['zara', 'vestido', 'feminino', 'floral'], '[{"url": "/products/vestido-zara.jpg", "alt": "Vestido Zara"}]', '{"size": "M", "color": "Floral Print", "length": "Midi"}'),
('MODA-BOLSA-MK', 'Bolsa Michael Kors Jet Set', 'bolsa-michael-kors-jet-set', 'Bolsa tote Michael Kors em couro saffiano. Modelo Jet Set clássico com zíper.', 'Bolsa MK Jet Set Tote', 20, 1299.00, 1599.00, 800.00, 20, 5, 'Michael Kors', true, true, ARRAY['michael kors', 'bolsa', 'feminino', 'couro'], '[{"url": "/products/mk-jetset.jpg", "alt": "Michael Kors Jet Set"}]', '{"color": "Black", "material": "Couro Saffiano"}'),

-- Calçados
('CALC-NIK-AM', 'Nike Air Max 90', 'nike-air-max-90', 'Tênis Nike Air Max 90 Essential. Design icônico dos anos 90 com tecnologia Air Max.', 'Air Max 90 Essential', 19, 899.00, 999.00, 550.00, 50, 15, 'Nike', true, true, ARRAY['nike', 'air max', 'tenis', 'retro'], '[{"url": "/products/airmax90.jpg", "alt": "Nike Air Max 90"}]', '{"size": "42", "color": "White/Black/Red"}'),
('CALC-ADD-UB', 'Adidas Ultraboost 23', 'adidas-ultraboost-23', 'Tênis de corrida premium Adidas com tecnologia Boost. Conforto máximo para qualquer distância.', 'Ultraboost 23 Running', 19, 999.00, 1199.00, 650.00, 35, 10, 'Adidas', true, false, ARRAY['adidas', 'ultraboost', 'running', 'corrida'], '[{"url": "/products/ultraboost23.jpg", "alt": "Adidas Ultraboost 23"}]', '{"size": "41", "color": "Core Black", "type": "Running"}'),

-- Casa e Decoração
('CASA-SOF-3L', 'Sofá 3 Lugares Retrátil', 'sofa-3-lugares-retratil', 'Sofá 3 lugares com assento retrátil e encosto reclinável. Tecido suede amassado.', 'Sofá Retrátil e Reclinável', 23, 2499.00, 2999.00, 1600.00, 15, 5, 'Tok&Stok', true, true, ARRAY['sofa', 'sala', 'retratil', 'reclinavel'], '[{"url": "/products/sofa-3l.jpg", "alt": "Sofá 3 Lugares"}]', '{"seats": "3", "color": "Cinza", "material": "Suede"}'),
('CASA-CAM-QE', 'Jogo de Cama Queen 400 Fios', 'jogo-cama-queen-400-fios', 'Jogo de cama queen em algodão egípcio 400 fios. Inclui 4 peças: lençol, fronhas e elástico.', 'Jogo de Cama Queen 400 Fios', 24, 449.00, 549.00, 280.00, 40, 10, 'Buddemeyer', true, false, ARRAY['cama', 'lencol', 'queen', 'algodao'], '[{"url": "/products/jogo-cama.jpg", "alt": "Jogo de Cama Queen"}]', '{"size": "Queen", "thread_count": "400", "material": "Algodão Egípcio"}'),
('CASA-PAF-4B', 'Panela Antiaderente 4 Bocas', 'jogo-panelas-antiaderente-4-bocas', 'Jogo de panelas antiaderentes com 4 peças. Revestimento cerâmico livre de PFOA.', 'Jogo de Panelas Cerâmicas', 25, 399.00, 499.00, 250.00, 50, 15, 'Tramontina', true, false, ARRAY['panela', 'cozinha', 'antiaderente', 'ceramica'], '[{"url": "/products/panelas.jpg", "alt": "Jogo de Panelas"}]', '{"pieces": "4", "coating": "Cerâmico", "compatible": "Indução"}'),

-- Fitness
('ESP-ESTR-PRO', 'Esteira Elétrica Profissional', 'esteira-eletrica-profissional', 'Esteira dobrável com motor 2.5HP, velocidade até 16km/h e inclinação automática.', 'Esteira Profissional 2.5HP', 28, 3299.00, 3999.00, 2200.00, 12, 3, 'Movement', true, true, ARRAY['esteira', 'fitness', 'cardio', 'academia'], '[{"url": "/products/esteira.jpg", "alt": "Esteira Elétrica"}]', '{"motor": "2.5HP", "max_speed": "16km/h", "incline": "Automática"}'),
('ESP-HALT-20', 'Kit Halteres Emborrachados 20kg', 'kit-halteres-emborrachados-20kg', 'Kit com par de halteres emborrachados ajustáveis de 2 a 20kg. Inclui suporte.', 'Kit Halteres 2-20kg', 28, 599.00, 749.00, 380.00, 30, 10, 'Kikos', true, false, ARRAY['halteres', 'musculacao', 'peso', 'academia'], '[{"url": "/products/halteres.jpg", "alt": "Kit Halteres"}]', '{"weight_range": "2-20kg", "material": "Emborrachado"}'),

-- Beleza
('BEL-PERF-CH', 'Perfume Chanel N5 100ml', 'perfume-chanel-n5-100ml', 'O icônico Chanel N5 Eau de Parfum. Uma fragrância floral aldeídica atemporal.', 'Chanel N5 EDP 100ml', 5, 899.00, 999.00, 650.00, 25, 8, 'Chanel', true, true, ARRAY['chanel', 'perfume', 'feminino', 'luxo'], '[{"url": "/products/chanel-n5.jpg", "alt": "Chanel N5"}]', '{"size": "100ml", "type": "Eau de Parfum", "gender": "Feminino"}'),
('BEL-HIDR-LOR', 'Hidratante Facial L''Oréal Revitalift', 'hidratante-facial-loreal-revitalift', 'Creme anti-idade com ácido hialurônico e pro-retinol. Reduz rugas e firma a pele.', 'L''Oréal Revitalift Anti-Idade', 5, 89.90, 109.90, 55.00, 80, 20, 'L''Oréal', true, false, ARRAY['loreal', 'hidratante', 'anti-idade', 'facial'], '[{"url": "/products/loreal-revitalift.jpg", "alt": "L''Oréal Revitalift"}]', '{"size": "50ml", "skin_type": "Todos", "age_range": "35+"}'),

-- Livros
('LIV-HBT-ATM', 'Hábitos Atômicos - James Clear', 'habitos-atomicos-james-clear', 'Best-seller sobre como pequenas mudanças produzem resultados extraordinários.', 'Hábitos Atômicos', 6, 54.90, 69.90, 32.00, 150, 30, 'Alta Books', true, true, ARRAY['livro', 'autoajuda', 'habitos', 'bestseller'], '[{"url": "/products/habitos-atomicos.jpg", "alt": "Hábitos Atômicos"}]', '{"author": "James Clear", "pages": "320", "format": "Físico"}'),
('LIV-SAP-YNH', 'Sapiens - Yuval Noah Harari', 'sapiens-yuval-noah-harari', 'Uma breve história da humanidade. Do Homo sapiens primitivo aos dias atuais.', 'Sapiens: Uma Breve História da Humanidade', 6, 59.90, 79.90, 38.00, 100, 25, 'Companhia das Letras', true, false, ARRAY['livro', 'historia', 'sapiens', 'bestseller'], '[{"url": "/products/sapiens.jpg", "alt": "Sapiens"}]', '{"author": "Yuval Noah Harari", "pages": "464", "format": "Físico"}'),

-- Brinquedos
('BRINQ-LEGO-HP', 'LEGO Harry Potter Hogwarts Castle', 'lego-harry-potter-hogwarts-castle', 'Set LEGO do Castelo de Hogwarts com 6.020 peças. Inclui 27 microfigures.', 'LEGO Hogwarts Castle 6020 peças', 7, 3499.00, 3999.00, 2600.00, 8, 3, 'LEGO', true, true, ARRAY['lego', 'harry potter', 'colecao', 'premium'], '[{"url": "/products/lego-hogwarts.jpg", "alt": "LEGO Hogwarts"}]', '{"pieces": "6020", "ages": "16+", "theme": "Harry Potter"}'),
('BRINQ-BARB-DH', 'Barbie Dreamhouse', 'barbie-dreamhouse', 'Casa dos Sonhos da Barbie com 3 andares e 75+ peças. Inclui piscina e elevador.', 'Barbie Dreamhouse 75+ peças', 7, 999.00, 1199.00, 650.00, 15, 5, 'Mattel', true, false, ARRAY['barbie', 'mattel', 'boneca', 'casa'], '[{"url": "/products/barbie-dh.jpg", "alt": "Barbie Dreamhouse"}]', '{"pieces": "75+", "ages": "3+", "floors": "3"}'),

-- Automotivo
('AUTO-PNEU-195', 'Pneu Pirelli Cinturato P1 195/55 R15', 'pneu-pirelli-cinturato-p1-195-55-r15', 'Pneu Pirelli com excelente aderência em pista molhada e durabilidade superior.', 'Pirelli Cinturato P1 195/55R15', 8, 459.00, 529.00, 320.00, 60, 15, 'Pirelli', true, false, ARRAY['pneu', 'pirelli', 'cinturato', 'carro'], '[{"url": "/products/pirelli-p1.jpg", "alt": "Pirelli Cinturato P1"}]', '{"size": "195/55 R15", "load_index": "85", "speed_rating": "V"}'),
('AUTO-BAT-60A', 'Bateria Moura 60Ah', 'bateria-moura-60ah', 'Bateria automotiva Moura 60Ah com 18 meses de garantia. Selada, livre de manutenção.', 'Bateria Moura 60Ah', 8, 529.00, 599.00, 380.00, 40, 10, 'Moura', true, false, ARRAY['bateria', 'moura', 'carro', 'automotivo'], '[{"url": "/products/moura-60.jpg", "alt": "Bateria Moura"}]', '{"capacity": "60Ah", "warranty": "18 meses", "type": "Selada"}'),

-- TVs
('TV-SAM-55-4K', 'Samsung Smart TV 55" 4K QLED', 'samsung-smart-tv-55-4k-qled', 'Smart TV Samsung 55" com tecnologia QLED, processador Crystal 4K e Gaming Hub.', 'Samsung QLED 55" 4K', 12, 3499.00, 3999.00, 2600.00, 25, 8, 'Samsung', true, true, ARRAY['samsung', 'tv', 'qled', '4k', 'smart'], '[{"url": "/products/samsung-tv55.jpg", "alt": "Samsung TV 55 QLED"}]', '{"size": "55\"", "resolution": "4K", "technology": "QLED"}'),
('TV-LG-65-OLED', 'LG Smart TV 65" 4K OLED evo', 'lg-smart-tv-65-4k-oled-evo', 'Smart TV LG OLED evo 65" com processador a9 Gen6 AI, Dolby Vision e webOS 23.', 'LG OLED evo 65" 4K', 12, 7999.00, 8999.00, 6200.00, 10, 3, 'LG', true, true, ARRAY['lg', 'tv', 'oled', '4k', 'premium'], '[{"url": "/products/lg-oled65.jpg", "alt": "LG OLED 65"}]', '{"size": "65\"", "resolution": "4K", "technology": "OLED evo"}'),

-- Câmeras
('CAM-CAN-R6', 'Canon EOS R6 Mark II', 'canon-eos-r6-mark-ii', 'Câmera mirrorless Canon full-frame com 24.2MP, vídeo 4K 60p e estabilização IBIS.', 'Canon EOS R6 Mark II Body', 14, 14999.00, 16999.00, 11500.00, 8, 3, 'Canon', true, true, ARRAY['canon', 'camera', 'mirrorless', 'profissional'], '[{"url": "/products/canon-r6.jpg", "alt": "Canon EOS R6 II"}]', '{"sensor": "Full-Frame", "megapixels": "24.2MP", "video": "4K 60p"}'),
('CAM-SONY-ZVE', 'Sony ZV-E10 Kit', 'sony-zv-e10-kit', 'Câmera Sony para vloggers com sensor APS-C, microfone direcional e flip screen.', 'Sony ZV-E10 + Lente 16-50mm', 14, 4999.00, 5499.00, 3800.00, 18, 5, 'Sony', true, false, ARRAY['sony', 'camera', 'vlog', 'youtube'], '[{"url": "/products/sony-zve10.jpg", "alt": "Sony ZV-E10"}]', '{"sensor": "APS-C", "megapixels": "24.2MP", "includes": "Lente 16-50mm"}'),

-- Tablets
('TAB-IPAD-AIR', 'iPad Air M2 256GB', 'ipad-air-m2-256gb', 'iPad Air com chip M2, tela Liquid Retina de 11" e suporte ao Apple Pencil Pro.', 'iPad Air 11" M2 256GB', 11, 6499.00, 6999.00, 5000.00, 22, 8, 'Apple', true, true, ARRAY['apple', 'ipad', 'tablet', 'm2'], '[{"url": "/products/ipad-air.jpg", "alt": "iPad Air M2"}]', '{"chip": "M2", "storage": "256GB", "display": "11\" Liquid Retina"}'),
('TAB-SAM-TABS9', 'Samsung Galaxy Tab S9 128GB', 'samsung-galaxy-tab-s9-128gb', 'Tablet Samsung com processador Snapdragon 8 Gen 2, tela Dynamic AMOLED 2X e S Pen inclusa.', 'Galaxy Tab S9 128GB', 11, 4999.00, 5499.00, 3800.00, 18, 5, 'Samsung', true, false, ARRAY['samsung', 'galaxy', 'tablet', 'android'], '[{"url": "/products/tab-s9.jpg", "alt": "Galaxy Tab S9"}]', '{"processor": "Snapdragon 8 Gen 2", "storage": "128GB", "display": "11\" AMOLED"}'),

-- Relógios
('REL-APPLE-S9', 'Apple Watch Series 9 45mm', 'apple-watch-series-9-45mm', 'Apple Watch com chip S9, tela Always-On Retina e monitoramento avançado de saúde.', 'Apple Watch Series 9 45mm GPS', 21, 4499.00, 4999.00, 3400.00, 30, 10, 'Apple', true, true, ARRAY['apple', 'watch', 'smartwatch', 'saude'], '[{"url": "/products/watch-s9.jpg", "alt": "Apple Watch S9"}]', '{"size": "45mm", "connectivity": "GPS", "chip": "S9"}'),
('REL-GARM-VEN', 'Garmin Venu 3', 'garmin-venu-3', 'Smartwatch Garmin com tela AMOLED, monitoramento de sono e bateria de até 14 dias.', 'Garmin Venu 3 GPS', 21, 3199.00, 3499.00, 2400.00, 15, 5, 'Garmin', true, false, ARRAY['garmin', 'venu', 'smartwatch', 'fitness'], '[{"url": "/products/garmin-venu3.jpg", "alt": "Garmin Venu 3"}]', '{"display": "AMOLED", "battery": "14 dias", "gps": "Sim"}'),

-- Acessórios Tech
('ACC-APPP-USB', 'Carregador Apple 35W Dual USB-C', 'carregador-apple-35w-dual-usb-c', 'Carregador compacto Apple com duas portas USB-C e potência de 35W.', 'Apple 35W Dual USB-C', 16, 299.00, 349.00, 180.00, 100, 25, 'Apple', true, false, ARRAY['apple', 'carregador', 'usb-c', 'acessorio'], '[{"url": "/products/apple-charger.jpg", "alt": "Apple Charger 35W"}]', '{"power": "35W", "ports": "2x USB-C"}'),
('ACC-ANK-PWBK', 'Anker PowerCore 20000mAh', 'anker-powercore-20000mah', 'Power bank de alta capacidade com PowerIQ 3.0. Carrega iPhone até 5 vezes.', 'Anker PowerCore 20000mAh', 16, 299.00, 399.00, 180.00, 75, 20, 'Anker', true, false, ARRAY['anker', 'powerbank', 'bateria', 'portatil'], '[{"url": "/products/anker-pb.jpg", "alt": "Anker PowerCore"}]', '{"capacity": "20000mAh", "ports": "USB-C, USB-A", "fast_charge": "Sim"}');

-- Create some initial customer data (will be expanded by seed script)
INSERT INTO customers (email, cpf, first_name, last_name, phone, birth_date, gender, is_active, is_verified, marketing_consent) VALUES
('maria.silva@email.com', '123.456.789-00', 'Maria', 'Silva', '(11) 99999-1111', '1985-03-15', 'Feminino', true, true, true),
('joao.santos@email.com', '234.567.890-11', 'João', 'Santos', '(21) 98888-2222', '1990-07-22', 'Masculino', true, true, false),
('ana.oliveira@email.com', '345.678.901-22', 'Ana', 'Oliveira', '(31) 97777-3333', '1988-11-08', 'Feminino', true, true, true),
('pedro.costa@email.com', '456.789.012-33', 'Pedro', 'Costa', '(41) 96666-4444', '1992-01-30', 'Masculino', true, false, false),
('lucia.ferreira@email.com', '567.890.123-44', 'Lucia', 'Ferreira', '(51) 95555-5555', '1995-09-12', 'Feminino', true, true, true);

-- Initial addresses
INSERT INTO addresses (customer_id, label, recipient_name, street, number, complement, neighborhood, city, state, postal_code, is_default, is_billing) VALUES
(1, 'Casa', 'Maria Silva', 'Rua das Flores', '123', 'Apto 45', 'Jardim Paulista', 'São Paulo', 'SP', '01234-567', true, true),
(1, 'Trabalho', 'Maria Silva', 'Av. Paulista', '1000', '15º andar', 'Bela Vista', 'São Paulo', 'SP', '01310-100', false, false),
(2, 'Casa', 'João Santos', 'Rua Copacabana', '456', '', 'Copacabana', 'Rio de Janeiro', 'RJ', '22070-000', true, true),
(3, 'Casa', 'Ana Oliveira', 'Av. Afonso Pena', '789', 'Casa 2', 'Centro', 'Belo Horizonte', 'MG', '30130-000', true, true),
(4, 'Casa', 'Pedro Costa', 'Rua XV de Novembro', '321', '', 'Centro', 'Curitiba', 'PR', '80020-310', true, true),
(5, 'Casa', 'Lucia Ferreira', 'Av. Ipiranga', '654', 'Bloco B', 'Centro Histórico', 'Porto Alegre', 'RS', '90160-000', true, true);
