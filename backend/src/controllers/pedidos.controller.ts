import { Request, Response } from 'express';
import { PrismaClient, EstadoPedido } from '@prisma/client';

const prisma = new PrismaClient();

const ESTADO_ORDEN: EstadoPedido[] = [
  'PENDIENTE', 'EN_COCINA', 'EN_PREPARACION', 'LISTO', 'ENTREGADO', 'PAGADO',
];

export async function getPedidos(req: Request, res: Response): Promise<void> {
  const { estado, tipo, fecha_inicio, fecha_fin, page = '1', limit = '20' } = req.query;

  const where: any = { restauranteId: req.restauranteId! };
  if (estado) where.estado = estado;
  if (tipo) where.tipo = tipo;
  if (fecha_inicio || fecha_fin) {
    where.creadoEn = {};
    if (fecha_inicio) where.creadoEn.gte = new Date(fecha_inicio as string);
    if (fecha_fin) where.creadoEn.lte = new Date(fecha_fin as string);
  }

  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const [total, pedidos] = await Promise.all([
    prisma.pedido.count({ where }),
    prisma.pedido.findMany({
      where,
      skip,
      take: parseInt(limit as string),
      orderBy: { creadoEn: 'desc' },
      include: {
        mesa: { select: { numero: true } },
        mesero: { select: { nombre: true } },
        items: { include: { producto: { select: { nombre: true, precio: true } } } },
      },
    }),
  ]);

  res.json({ data: pedidos, total, page: parseInt(page as string), limit: parseInt(limit as string) });
}

export async function getPedidosActivos(req: Request, res: Response): Promise<void> {
  const pedidos = await prisma.pedido.findMany({
    where: {
      restauranteId: req.restauranteId!,
      estado: { notIn: ['PAGADO', 'CANCELADO'] },
    },
    orderBy: { creadoEn: 'asc' },
    include: {
      mesa: { select: { numero: true } },
      mesero: { select: { nombre: true } },
      items: {
        include: {
          producto: {
            select: { nombre: true, imagen: true, requiereCocina: true },
          },
        },
        orderBy: { id: 'asc' },
      },
    },
  });
  res.json(pedidos);
}

export async function addItemsToPedido(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { items } = req.body;

  if (!items?.length) { res.status(400).json({ error: 'Items requeridos' }); return; }

  const pedido = await prisma.pedido.findFirst({
    where: { id, restauranteId: req.restauranteId! },
  });
  if (!pedido) { res.status(404).json({ error: 'Pedido no encontrado' }); return; }
  if (['PAGADO', 'CANCELADO'].includes(pedido.estado)) {
    res.status(400).json({ error: 'No se pueden añadir items a un pedido finalizado' });
    return;
  }

  const productos = await prisma.producto.findMany({
    where: { id: { in: items.map((i: any) => i.productoId) }, restauranteId: req.restauranteId! },
  });

  const itemsData = items.map((item: any) => {
    const prod = productos.find((p) => p.id === item.productoId);
    if (!prod) throw new Error(`Producto ${item.productoId} no encontrado`);
    const precio = Number(prod.precio);
    return { productoId: item.productoId, cantidad: item.cantidad, precio, subtotal: precio * item.cantidad, requiereCocina: prod.requiereCocina };
  });

  const extraTotal = itemsData.reduce((s: number, i: any) => s + i.subtotal, 0);

  // Si algún ítem nuevo va a cocina → el pedido vuelve a EN_COCINA
  const algunoRequiereCocina = itemsData.some((i: any) => i.requiereCocina);
  const nuevoEstado = algunoRequiereCocina ? 'EN_COCINA' : undefined;

  const updated = await prisma.$transaction(async (tx) => {
    await tx.itemPedido.createMany({
      data: itemsData.map((i: any) => ({
        pedidoId: id,
        productoId: i.productoId,
        cantidad: i.cantidad,
        precio: i.precio,
        subtotal: i.subtotal,
      })),
    });
    return tx.pedido.update({
      where: { id },
      data: {
        total: { increment: extraTotal },
        ...(nuevoEstado && { estado: nuevoEstado }),
      },
      include: {
        mesa: { select: { numero: true } },
        items: { include: { producto: { select: { nombre: true, imagen: true, requiereCocina: true } } } },
      },
    });
  });

  res.json(updated);
}

export async function getPedidoById(req: Request, res: Response): Promise<void> {
  const pedido = await prisma.pedido.findFirst({
    where: { id: req.params.id, restauranteId: req.restauranteId! },
    include: {
      mesa: { select: { numero: true } },
      mesero: { select: { nombre: true } },
      items: { include: { producto: true } },
    },
  });
  if (!pedido) { res.status(404).json({ error: 'Pedido no encontrado' }); return; }
  res.json(pedido);
}

export async function createPedido(req: Request, res: Response): Promise<void> {
  const { tipo, mesaId, items } = req.body;
  const meseroId = req.user!.userId;

  if (!items?.length) { res.status(400).json({ error: 'Items requeridos' }); return; }

  const productos = await prisma.producto.findMany({
    where: { id: { in: items.map((i: any) => i.productoId) }, restauranteId: req.restauranteId! },
  });

  const itemsData = items.map((item: any) => {
    const prod = productos.find((p) => p.id === item.productoId);
    if (!prod) throw new Error(`Producto ${item.productoId} no encontrado`);
    const precio = Number(prod.precio);
    return {
      productoId: item.productoId,
      cantidad: item.cantidad,
      precio,
      subtotal: precio * item.cantidad,
    };
  });

  const total = itemsData.reduce((s: number, i: any) => s + i.subtotal, 0);

  const pedido = await prisma.$transaction(async (tx) => {
    const p = await tx.pedido.create({
      data: {
        tipo,
        mesaId: mesaId || null,
        meseroId,
        restauranteId: req.restauranteId!,
        total,
        estado: 'EN_COCINA',
        items: { create: itemsData },
      },
      include: {
        mesa: { select: { numero: true } },
        items: { include: { producto: { select: { nombre: true } } } },
      },
    });

    if (mesaId) {
      await tx.mesa.update({ where: { id: mesaId }, data: { estado: 'OCUPADA' } });
    }

    return p;
  });

  res.status(201).json(pedido);
}

/**
 * Transiciones válidas — bloqueamos saltos hacia atrás o estados imposibles.
 * Cualquier estado puede ir a CANCELADO (excepto PAGADO).
 */
const TRANSICIONES_VALIDAS: Record<EstadoPedido, EstadoPedido[]> = {
  PENDIENTE:      ['EN_COCINA', 'LISTO', 'CANCELADO'],
  EN_COCINA:      ['LISTO', 'CANCELADO'],
  EN_PREPARACION: ['LISTO', 'CANCELADO'],
  LISTO:          ['ENTREGADO', 'CANCELADO'],
  ENTREGADO:      ['PAGADO', 'EN_COCINA'],
  PAGADO:         [],
  CANCELADO:      [],
};

export async function updateEstadoPedido(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { estado } = req.body;

  if (!ESTADO_ORDEN.includes(estado) && estado !== 'CANCELADO') {
    res.status(400).json({ error: 'Estado inválido' });
    return;
  }

  const pedido = await prisma.pedido.findFirst({
    where: { id, restauranteId: req.restauranteId! },
  });
  if (!pedido) { res.status(404).json({ error: 'Pedido no encontrado' }); return; }

  // Validar transición: solo permitimos avanzar por la máquina de estados
  const permitidos = TRANSICIONES_VALIDAS[pedido.estado] ?? [];
  if (!permitidos.includes(estado)) {
    res.status(400).json({
      error: `Transición inválida: ${pedido.estado} → ${estado}. Permitidos: ${permitidos.join(', ') || 'ninguno (estado final)'}`,
    });
    return;
  }

  const updateData: any = { estado };
  if (estado === 'EN_PREPARACION') updateData.tiempoInicio = new Date();
  if (estado === 'LISTO')          updateData.tiempoListo  = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    // Al marcar LISTO, todos los ítems pendientes quedan como servidos
    if (estado === 'LISTO') {
      await tx.itemPedido.updateMany({
        where: { pedidoId: id, servido: false },
        data: { servido: true },
      });
    }
    const p = await tx.pedido.update({
      where: { id },
      data: updateData,
      include: { mesa: true, items: { include: { producto: true } } },
    });
    if (estado === 'PAGADO' && pedido.mesaId) {
      await tx.mesa.update({ where: { id: pedido.mesaId }, data: { estado: 'LIBRE' } });
    }
    return p;
  });

  res.json(updated);
}

export async function registrarPago(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { metodoPago } = req.body;

  const pedido = await prisma.pedido.findFirst({
    where: { id, restauranteId: req.restauranteId! },
  });
  if (!pedido) { res.status(404).json({ error: 'Pedido no encontrado' }); return; }

  const updated = await prisma.$transaction(async (tx) => {
    const p = await tx.pedido.update({
      where: { id },
      data: { estado: 'PAGADO', pagado: true, metodoPago },
    });
    if (pedido.mesaId) {
      await tx.mesa.update({ where: { id: pedido.mesaId }, data: { estado: 'LIBRE' } });
    }
    return p;
  });

  res.json(updated);
}
