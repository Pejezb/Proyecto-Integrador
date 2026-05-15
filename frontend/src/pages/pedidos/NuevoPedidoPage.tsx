import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Minus, Trash2, CheckCircle, Utensils } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { menuService } from '../../services/menu.service';
import { mesasService } from '../../services/mesas.service';
import { pedidosService } from '../../services/pedidos.service';
import { formatCurrency } from '../../utils/cn';
import type { Producto, Categoria, Mesa } from '../../types';
import toast from 'react-hot-toast';
import { cn } from '../../utils/cn';

interface CartItem { producto: Producto; cantidad: number; }

export default function NuevoPedidoPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const initialMesaId = searchParams.get('mesaId') ?? '';

  const [tipo, setTipo] = useState<'EN_MESA' | 'PARA_LLEVAR'>('EN_MESA');
  const [mesaId, setMesaId] = useState(initialMesaId);
  const [catActiva, setCatActiva] = useState<string>('todas');
  const [cart, setCart] = useState<CartItem[]>([]);

  const { data: productos = [] } = useQuery<Producto[]>({ queryKey: ['productos'], queryFn: menuService.getProductos });
  const { data: categorias = [] } = useQuery<Categoria[]>({ queryKey: ['categorias'], queryFn: menuService.getCategorias });
  const { data: mesas = [] } = useQuery<Mesa[]>({ queryKey: ['mesas'], queryFn: mesasService.getAll });

  const prodFiltrados = catActiva === 'todas' ? productos.filter(p => p.disponible) : productos.filter(p => p.disponible && p.categoriaId === catActiva);

  const addItem = (prod: Producto) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.producto.id === prod.id);
      if (existing) return prev.map((i) => i.producto.id === prod.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      return [...prev, { producto: prod, cantidad: 1 }];
    });
  };

  const removeItem = (id: string) => setCart((prev) => prev.filter((i) => i.producto.id !== id));
  const updateQty = (id: string, delta: number) => {
    setCart((prev) => prev.map((i) => i.producto.id === id ? { ...i, cantidad: Math.max(1, i.cantidad + delta) } : i));
  };

  const total = cart.reduce((s, i) => s + Number(i.producto.precio) * i.cantidad, 0);

  const crearPedido = useMutation({
    mutationFn: () => pedidosService.create({
      tipo,
      mesaId: tipo === 'EN_MESA' ? mesaId : undefined,
      items: cart.map((i) => ({ productoId: i.producto.id, cantidad: i.cantidad })),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mesas'] }); toast.success('Pedido enviado a cocina'); navigate('/mesas'); },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Error al crear pedido'),
  });

  return (
    <div className="flex gap-5 h-full">
      {/* Left: Catalog */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {/* Selectors */}
        <div className="flex items-center gap-4 flex-wrap">
          {tipo === 'EN_MESA' && (
            <select
              value={mesaId}
              onChange={(e) => setMesaId(e.target.value)}
              className="bg-muted border border-border rounded-m px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
            >
              <option value="">Seleccionar mesa</option>
              {mesas.filter(m => m.estado === 'LIBRE').map((m) => (
                <option key={m.id} value={m.id}>Mesa {m.numero}</option>
              ))}
            </select>
          )}
          <div className="flex rounded-m border border-border overflow-hidden">
            <button
              onClick={() => setTipo('EN_MESA')}
              className={cn('px-4 py-2 text-sm font-medium transition-colors', tipo === 'EN_MESA' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:text-foreground')}
            >En mesa</button>
            <button
              onClick={() => setTipo('PARA_LLEVAR')}
              className={cn('px-4 py-2 text-sm font-medium transition-colors', tipo === 'PARA_LLEVAR' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:text-foreground')}
            >Para llevar</button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setCatActiva('todas')}
            className={cn('px-4 py-1.5 rounded-pill text-sm font-medium transition-colors', catActiva === 'todas' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:text-foreground')}
          >Todas</button>
          {categorias.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCatActiva(cat.id)}
              className={cn('px-4 py-1.5 rounded-pill text-sm font-medium transition-colors', catActiva === cat.id ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:text-foreground')}
            >{cat.nombre}</button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 overflow-y-auto">
          {prodFiltrados.map((prod) => {
            const inCart = cart.find((i) => i.producto.id === prod.id);
            return (
              <div key={prod.id}
                className={cn('bg-card border-2 rounded-xl overflow-hidden flex flex-col transition-all',
                  inCart ? 'border-primary shadow-md shadow-primary/20' : 'border-border')}>
                <div className="relative h-28 bg-muted overflow-hidden">
                  {prod.imagen ? (
                    <img src={prod.imagen} alt={prod.nombre} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Utensils size={20} className="text-muted-foreground/30" />
                    </div>
                  )}
                  {inCart && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary text-white font-black text-xs flex items-center justify-center">
                      {inCart.cantidad}
                    </div>
                  )}
                </div>
                <div className="p-3 flex flex-col gap-1.5 flex-1">
                  <p className="text-sm font-semibold text-foreground line-clamp-2 leading-tight">{prod.nombre}</p>
                  <p className="text-primary font-bold text-sm">{formatCurrency(Number(prod.precio))}</p>
                  <Button size="sm" className="w-full mt-auto" onClick={() => addItem(prod)}>
                    <Plus size={12} /> Agregar
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Order Panel */}
      <div className="w-80 flex-shrink-0 flex flex-col bg-card border border-border rounded-l">
        <div className="px-4 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Orden Actual</h3>
          {cart.length > 0 && (
            <button onClick={() => setCart([])} className="text-xs text-error hover:underline">Limpiar</button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-border/50">
          {cart.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">Sin items agregados</p>
          ) : cart.map((item) => (
            <div key={item.producto.id} className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground font-medium truncate">{item.producto.nombre}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(Number(item.producto.precio))}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => updateQty(item.producto.id, -1)} className="w-6 h-6 rounded bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
                  <Minus size={10} />
                </button>
                <span className="w-6 text-center text-sm text-foreground font-medium">{item.cantidad}</span>
                <button onClick={() => updateQty(item.producto.id, 1)} className="w-6 h-6 rounded bg-primary flex items-center justify-center text-white">
                  <Plus size={10} />
                </button>
              </div>
              <span className="text-sm text-foreground w-16 text-right">
                {formatCurrency(Number(item.producto.precio) * item.cantidad)}
              </span>
              <button onClick={() => removeItem(item.producto.id)} className="text-muted-foreground hover:text-error">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        <div className="border-t border-border p-4 space-y-3">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Subtotal</span><span>{formatCurrency(total)}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-foreground">
            <span>TOTAL</span><span className="text-primary">{formatCurrency(total)}</span>
          </div>
          <Button
            className="w-full"
            loading={crearPedido.isPending}
            disabled={cart.length === 0 || (tipo === 'EN_MESA' && !mesaId)}
            onClick={() => crearPedido.mutate()}
          >
            <CheckCircle size={15} /> Confirmar y enviar a cocina
          </Button>
          <button onClick={() => navigate(-1)} className="w-full text-xs text-muted-foreground hover:text-foreground text-center">
            Cancelar pedido
          </button>
        </div>
      </div>
    </div>
  );
}
