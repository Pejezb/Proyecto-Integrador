import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Utensils, ChefHat, LogOut, CheckCircle2 } from 'lucide-react';
import { pedidosService } from '../../services/pedidos.service';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';
import type { Pedido, ItemPedido } from '../../types';

// Solo ítems que van a cocina y aún no fueron marcados como servidos
function itemsCocina(items: ItemPedido[]) {
  return items.filter((i) => i.producto.requiereCocina !== false && !i.servido);
}

export default function CocinaPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date().toLocaleTimeString('es-PE'));

  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toLocaleTimeString('es-PE')), 1000);
    return () => clearInterval(id);
  }, []);

  const { data: pedidos = [] } = useQuery<Pedido[]>({
    queryKey: ['pedidosActivos'],
    queryFn: pedidosService.getActivos,
    refetchInterval: 8000,
  });

  const marcarListo = useMutation({
    mutationFn: (id: string) => pedidosService.updateEstado(id, 'LISTO'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pedidosActivos'] }),
    onError: () => toast.error('Error al actualizar estado'),
  });

  // Pendientes: en cocina o preparación (lo que aún no está listo)
  const pendientes = pedidos.filter((p) =>
    ['PENDIENTE', 'EN_COCINA', 'EN_PREPARACION'].includes(p.estado) &&
    itemsCocina(p.items).length > 0
  );

  // Listos: ya marcados, esperando que el mesero los recoja
  const listos = pedidos.filter((p) =>
    p.estado === 'LISTO' && itemsCocina(p.items).length > 0
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-sidebar-bg border-b border-border flex items-center justify-between px-4 py-3 gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            <LogOut size={15} className="rotate-180" />
            Salir
          </button>
          <span className="text-border">|</span>
          <ChefHat size={18} className="text-primary" />
          <span className="font-bold text-foreground">Cocina</span>
          {pendientes.length > 0 && (
            <span className="bg-warning text-background text-xs font-black px-2 py-0.5 rounded-full animate-pulse">
              {pendientes.length} pendiente{pendientes.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <span className="text-sm font-mono text-muted-foreground">{time}</span>
      </header>

      <main className="flex-1 p-4 space-y-6">

        {/* ── Pendientes ── */}
        {pendientes.length === 0 && listos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <ChefHat size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-medium">Sin pedidos en cocina</p>
            <p className="text-sm mt-1">Los nuevos pedidos aparecerán aquí automáticamente</p>
          </div>
        ) : (
          <>
            {pendientes.length > 0 && (
              <section>
                <h2 className="text-xs font-bold text-warning uppercase tracking-widest mb-3">
                  Por preparar ({pendientes.length})
                </h2>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {pendientes.map((pedido) => {
                    const items = itemsCocina(pedido.items);
                    return (
                      <div
                        key={pedido.id}
                        className="bg-card border-2 border-warning rounded-xl flex flex-col overflow-hidden"
                      >
                        {/* Cabecera */}
                        <div className="px-4 py-3 bg-warning/10 flex items-center justify-between">
                          <div>
                            <p className="font-black text-foreground text-xl leading-tight">
                              {pedido.mesa ? `Mesa ${pedido.mesa.numero}` : '🥡 Para llevar'}
                            </p>
                            <p className="text-xs text-muted-foreground">Pedido #{pedido.numero}</p>
                          </div>
                          <span className="text-xs bg-warning text-background font-bold px-2 py-1 rounded-lg">
                            NUEVO
                          </span>
                        </div>

                        {/* Items */}
                        <div className="flex-1 p-3 space-y-2">
                          {items.map((item) => (
                            <div key={item.id} className="flex items-center gap-3 bg-muted/40 rounded-lg p-2">
                              {item.producto.imagen ? (
                                <img
                                  src={item.producto.imagen}
                                  alt={item.producto.nombre}
                                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                  <Utensils size={18} className="text-muted-foreground" />
                                </div>
                              )}
                              <p className="flex-1 font-semibold text-foreground text-sm leading-tight">
                                {item.producto.nombre}
                              </p>
                              <span className="text-2xl font-black text-foreground bg-background rounded-lg px-3 py-1 flex-shrink-0">
                                ×{item.cantidad}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Botón único */}
                        <div className="p-3 pt-0">
                          <button
                            disabled={marcarListo.isPending}
                            onClick={() => marcarListo.mutate(pedido.id)}
                            className={cn(
                              'w-full py-4 rounded-xl font-black text-lg transition-all active:scale-95',
                              'bg-success text-white hover:bg-success/90',
                              marcarListo.isPending && 'opacity-50 cursor-not-allowed'
                            )}
                          >
                            {marcarListo.isPending ? '...' : '✓ Pedido listo'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ── Listos esperando mesero ── */}
            {listos.length > 0 && (
              <section>
                <h2 className="text-xs font-bold text-success uppercase tracking-widest mb-3">
                  Listos — esperando mesero ({listos.length})
                </h2>
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {listos.map((pedido) => (
                    <div
                      key={pedido.id}
                      className="bg-card border-2 border-success/50 rounded-xl p-4 flex flex-col items-center gap-2 text-center"
                    >
                      <CheckCircle2 size={28} className="text-success" />
                      <p className="font-black text-foreground text-lg">
                        {pedido.mesa ? `Mesa ${pedido.mesa.numero}` : 'Llevar'}
                      </p>
                      <p className="text-xs text-muted-foreground">#{pedido.numero}</p>
                      <p className="text-xs text-success font-semibold">
                        {itemsCocina(pedido.items).length} ítem{itemsCocina(pedido.items).length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
