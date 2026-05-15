import { PrismaClient, Rol, EstadoMesa } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Limpiando base de datos...');

  // Limpiar en orden por FK
  await prisma.itemPedido.deleteMany();
  await prisma.pedido.deleteMany();
  await prisma.producto.deleteMany();
  await prisma.categoria.deleteMany();
  await prisma.insumo.deleteMany();
  await prisma.mesa.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.restaurante.deleteMany();

  console.log('✅ BD limpia');
  console.log('🌱 Cargando datos de pollería...');

  // ── Restaurante ──────────────────────────────────────────────────────
  const restaurante = await prisma.restaurante.create({
    data: {
      id: 'rest-polleria-1',
      nombre: 'Pollería El Gallo de Oro',
      direccion: 'Av. Principal 456',
      telefono: '01-234-5678',
      timerMesa: 45,
    },
  });
  console.log('✅ Restaurante:', restaurante.nombre);

  // ── Usuarios ─────────────────────────────────────────────────────────
  const usuarios = [
    { nombre: 'Administrador',   email: 'admin@polleria.com',   password: 'Admin123!',  rol: Rol.ADMIN },
    { nombre: 'Carlos Mesero',   email: 'mesero@polleria.com',  password: 'Mesero123!', rol: Rol.MESERO },
    { nombre: 'Juan Cocinero',   email: 'cocina@polleria.com',  password: 'Cocina123!', rol: Rol.COCINERO },
    { nombre: 'María Cajera',    email: 'caja@polleria.com',    password: 'Caja123!',   rol: Rol.CAJERO },
  ];

  for (const u of usuarios) {
    const hash = await bcrypt.hash(u.password, 10);
    await prisma.usuario.create({
      data: {
        nombre: u.nombre,
        email: u.email,
        passwordHash: hash,
        rol: u.rol,
        restauranteId: restaurante.id,
      },
    });
    console.log(`   👤 ${u.nombre} (${u.rol}) — ${u.email} / ${u.password}`);
  }

  // ── Mesas ─────────────────────────────────────────────────────────────
  const capacidades = [2, 2, 4, 4, 4, 4, 4, 4, 6, 6, 6, 8];
  for (let i = 1; i <= 12; i++) {
    await prisma.mesa.create({
      data: {
        id: `mesa-${i}`,
        numero: i,
        capacidad: capacidades[i - 1],
        estado: EstadoMesa.LIBRE,
        restauranteId: restaurante.id,
      },
    });
  }
  console.log('✅ 12 mesas creadas (cap: 2×2, 6×4, 3×6, 1×8)');

  // ── Categorías ────────────────────────────────────────────────────────
  const cats = [
    { id: 'cat-pollos',         nombre: 'Pollos a la Brasa' },
    { id: 'cat-combos',         nombre: 'Combos' },
    { id: 'cat-acompanamientos',nombre: 'Acompañamientos' },
    { id: 'cat-bebidas',        nombre: 'Bebidas' },
    { id: 'cat-extras',         nombre: 'Extras y Salsas' },
  ];

  for (const c of cats) {
    await prisma.categoria.create({
      data: { ...c, restauranteId: restaurante.id },
    });
  }
  console.log('✅ 5 categorías creadas');

  // ── Productos ─────────────────────────────────────────────────────────
  const productos = [
    // Pollos a la brasa
    { id: 'prod-pollo-entero',    nombre: 'Pollo entero',            precio: 55.00, cat: 'cat-pollos',          requiereCocina: true,  desc: 'Pollo a la brasa entero con guarnición' },
    { id: 'prod-medio-pollo',     nombre: 'Medio pollo',             precio: 29.00, cat: 'cat-pollos',          requiereCocina: true,  desc: 'Medio pollo a la brasa con guarnición' },
    { id: 'prod-cuarto-pollo',    nombre: '1/4 de pollo',            precio: 16.00, cat: 'cat-pollos',          requiereCocina: true,  desc: 'Cuarto de pollo a la brasa con guarnición' },
    { id: 'prod-octavo-pollo',    nombre: '1/8 de pollo (presa)',    precio: 10.00, cat: 'cat-pollos',          requiereCocina: true,  desc: 'Presa de pollo a la brasa' },

    // Combos
    { id: 'prod-combo-personal',  nombre: 'Combo Personal',          precio: 22.00, cat: 'cat-combos',          requiereCocina: true,  desc: '1/4 pollo + papas fritas + gaseosa personal' },
    { id: 'prod-combo-duo',       nombre: 'Combo Dúo',               precio: 42.00, cat: 'cat-combos',          requiereCocina: true,  desc: '1/2 pollo + papas fritas + ensalada + 2 gaseosas' },
    { id: 'prod-combo-familiar',  nombre: 'Combo Familiar',          precio: 65.00, cat: 'cat-combos',          requiereCocina: true,  desc: 'Pollo entero + papas fritas + ensalada + 4 gaseosas' },
    { id: 'prod-combo-broaster',  nombre: 'Combo Broaster Personal', precio: 18.00, cat: 'cat-combos',          requiereCocina: true,  desc: '3 piezas broaster + papas + gaseosa' },
    { id: 'prod-combo-broaster2', nombre: 'Combo Broaster Familiar', precio: 52.00, cat: 'cat-combos',          requiereCocina: true,  desc: '8 piezas broaster + papas + ensalada + 4 gaseosas' },

    // Acompañamientos
    { id: 'prod-papas-fritas',    nombre: 'Papas fritas',            precio: 8.00,  cat: 'cat-acompanamientos', requiereCocina: true,  desc: 'Porción de papas fritas crujientes' },
    { id: 'prod-yuca-frita',      nombre: 'Yuca frita',              precio: 8.00,  cat: 'cat-acompanamientos', requiereCocina: true,  desc: 'Porción de yuca frita' },
    { id: 'prod-ensalada',        nombre: 'Ensalada',                precio: 5.00,  cat: 'cat-acompanamientos', requiereCocina: true,  desc: 'Ensalada fresca de la casa' },
    { id: 'prod-arroz',           nombre: 'Arroz',                   precio: 4.00,  cat: 'cat-acompanamientos', requiereCocina: true,  desc: 'Porción de arroz blanco' },
    { id: 'prod-chaufa-arroz',    nombre: 'Arroz chaufa',            precio: 10.00, cat: 'cat-acompanamientos', requiereCocina: true,  desc: 'Porción de arroz chaufa' },

    // Bebidas (no van a cocina, el mesero las sirve directo)
    { id: 'prod-inca-personal',   nombre: 'Inca Kola personal',      precio: 5.00,  cat: 'cat-bebidas',         requiereCocina: false, desc: '500ml' },
    { id: 'prod-inca-grande',     nombre: 'Inca Kola 1.5L',          precio: 10.00, cat: 'cat-bebidas',         requiereCocina: false, desc: '1.5 litros' },
    { id: 'prod-coca-personal',   nombre: 'Coca Cola personal',      precio: 5.00,  cat: 'cat-bebidas',         requiereCocina: false, desc: '500ml' },
    { id: 'prod-coca-grande',     nombre: 'Coca Cola 1.5L',          precio: 10.00, cat: 'cat-bebidas',         requiereCocina: false, desc: '1.5 litros' },
    { id: 'prod-chicha',          nombre: 'Chicha morada',           precio: 6.00,  cat: 'cat-bebidas',         requiereCocina: false, desc: 'Vaso grande' },
    { id: 'prod-limonada',        nombre: 'Limonada',                precio: 7.00,  cat: 'cat-bebidas',         requiereCocina: false, desc: 'Vaso grande con hielo' },
    { id: 'prod-agua',            nombre: 'Agua San Luis',           precio: 3.00,  cat: 'cat-bebidas',         requiereCocina: false, desc: '625ml' },

    // Extras y salsas (no van a cocina)
    { id: 'prod-salsa-criolla',   nombre: 'Salsa criolla',           precio: 2.00,  cat: 'cat-extras',          requiereCocina: false, desc: 'Porción de salsa criolla' },
    { id: 'prod-salsa-huancaina', nombre: 'Salsa huancaína',         precio: 3.00,  cat: 'cat-extras',          requiereCocina: false, desc: 'Porción de salsa huancaína' },
    { id: 'prod-aji-verde',       nombre: 'Ají verde',               precio: 2.00,  cat: 'cat-extras',          requiereCocina: false, desc: 'Porción de ají verde' },
    { id: 'prod-ketchup',         nombre: 'Ketchup',                 precio: 1.00,  cat: 'cat-extras',          requiereCocina: false },
    { id: 'prod-mayonesa',        nombre: 'Mayonesa',                precio: 1.00,  cat: 'cat-extras',          requiereCocina: false },
  ];

  for (const p of productos) {
    await prisma.producto.create({
      data: {
        id: p.id,
        nombre: p.nombre,
        descripcion: p.desc ?? null,
        precio: p.precio,
        disponible: true,
        requiereCocina: p.requiereCocina,
        categoriaId: p.cat,
        restauranteId: restaurante.id,
      },
    });
  }
  console.log(`✅ ${productos.length} productos creados`);

  // ── Insumos ───────────────────────────────────────────────────────────
  const insumos = [
    { nombre: 'Pollo entero',      categoria: 'Carnes',      unidad: 'unid', stockActual: 30, stockMinimo: 10 },
    { nombre: 'Papas',             categoria: 'Verduras',    unidad: 'kg',   stockActual: 25, stockMinimo: 10 },
    { nombre: 'Yuca',              categoria: 'Verduras',    unidad: 'kg',   stockActual: 10, stockMinimo: 5  },
    { nombre: 'Lechuga',           categoria: 'Verduras',    unidad: 'kg',   stockActual: 3,  stockMinimo: 2  },
    { nombre: 'Tomate',            categoria: 'Verduras',    unidad: 'kg',   stockActual: 4,  stockMinimo: 2  },
    { nombre: 'Carbón',            categoria: 'Combustible', unidad: 'kg',   stockActual: 50, stockMinimo: 20 },
    { nombre: 'Aceite vegetal',    categoria: 'Aceites',     unidad: 'L',    stockActual: 10, stockMinimo: 4  },
    { nombre: 'Sal',               categoria: 'Condimentos', unidad: 'kg',   stockActual: 5,  stockMinimo: 2  },
    { nombre: 'Condimento pollería', categoria: 'Condimentos', unidad: 'kg', stockActual: 2,  stockMinimo: 1  },
    { nombre: 'Ají amarillo',      categoria: 'Condimentos', unidad: 'kg',   stockActual: 1,  stockMinimo: 0.5},
    { nombre: 'Limón',             categoria: 'Verduras',    unidad: 'kg',   stockActual: 3,  stockMinimo: 2  },
  ];

  for (const ins of insumos) {
    await prisma.insumo.create({
      data: {
        id: `insumo-${ins.nombre.toLowerCase().replace(/ /g, '-')}`,
        ...ins,
        restauranteId: restaurante.id,
      },
    });
  }
  console.log(`✅ ${insumos.length} insumos cargados`);

  console.log('\n🎉 ¡Base de datos lista!\n');
  console.log('📋 ACCESOS:');
  console.log('   Admin:    admin@polleria.com   / Admin123!');
  console.log('   Mesero:   mesero@polleria.com  / Mesero123!');
  console.log('   Cocinero: cocina@polleria.com  / Cocina123!');
  console.log('   Cajero:   caja@polleria.com    / Caja123!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
