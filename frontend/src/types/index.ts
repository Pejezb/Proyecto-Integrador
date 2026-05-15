export type Rol = 'ADMIN' | 'MESERO' | 'COCINERO' | 'CAJERO';
export type EstadoMesa = 'LIBRE' | 'OCUPADA' | 'EN_ESPERA';
export type TipoPedido = 'EN_MESA' | 'PARA_LLEVAR';
export type EstadoPedido = 'PENDIENTE' | 'EN_COCINA' | 'EN_PREPARACION' | 'LISTO' | 'ENTREGADO' | 'PAGADO' | 'CANCELADO';
export type EstadoInsumo = 'OK' | 'BAJO' | 'CRITICO';

export interface Restaurante {
  id: string;
  nombre: string;
  direccion?: string;
  telefono?: string;
  timerMesa: number;
}

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
  restauranteId: string;
  restaurante?: { id: string; nombre: string };
  creadoEn: string;
}

export interface Mesa {
  id: string;
  numero: number;
  capacidad: number;
  estado: EstadoMesa;
  pedidoActivo?: Pedido | null;
  timerRestante?: number | null;
  mesero?: string | null;
}

export interface Categoria {
  id: string;
  nombre: string;
  restauranteId: string;
}

export interface Producto {
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  imagen?: string;
  disponible: boolean;
  requiereCocina: boolean;
  categoriaId: string;
  categoria?: Categoria;
}

export interface Insumo {
  id: string;
  nombre: string;
  categoria?: string;
  unidad: string;
  stockActual: number;
  stockMinimo: number;
  proveedor?: string;
  estado: EstadoInsumo;
  creadoEn: string;
  actualizadoEn: string;
}

export interface ItemPedido {
  id: string;
  productoId: string;
  producto: { nombre: string; precio?: number; imagen?: string; requiereCocina?: boolean };
  cantidad: number;
  precio: number;
  subtotal: number;
  servido: boolean;
}

export interface Pedido {
  id: string;
  numero: number;
  tipo: TipoPedido;
  estado: EstadoPedido;
  mesaId?: string;
  mesa?: { numero: number } | null;
  meseroId?: string;
  mesero?: { nombre: string } | null;
  restauranteId: string;
  items: ItemPedido[];
  pagado: boolean;
  metodoPago?: string;
  total?: number;
  tiempoInicio?: string;
  tiempoListo?: string;
  creadoEn: string;
  actualizadoEn: string;
}

export interface DashboardStats {
  ventasHoy: number;
  pedidosHoy: number;
  mesasOcupadas: number;
  totalMesas: number;
  alertasCount: number;
  pedidosRecientes: Pedido[];
  alertasDetalle: Insumo[];
}

export interface VentasReport {
  totalVentas: number;
  totalPedidos: number;
  chartData: { fecha: string; ventas: number }[];
  periodo: string;
}

export interface TopProducto {
  nombre: string;
  cantidad: number;
  ingresos: number;
  porcentaje: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
