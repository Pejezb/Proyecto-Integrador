import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Search, ImagePlus, ChefHat, Coffee } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { menuService } from '../../services/menu.service';
import { formatCurrency } from '../../utils/cn';
import type { Producto, Categoria } from '../../types';
import toast from 'react-hot-toast';
import { cn } from '../../utils/cn';

const schema = z.object({
  nombre:         z.string().min(1, 'Requerido'),
  descripcion:    z.string().optional(),
  precio:         z.number({ invalid_type_error: 'Precio requerido' }).positive('Debe ser positivo'),
  categoriaId:    z.string().min(1, 'Selecciona una categoría'),
  disponible:     z.boolean(),
  requiereCocina: z.boolean(),
});

type FormData = z.infer<typeof schema>;

export default function MenuPage() {
  const qc = useQueryClient();
  const [catActiva, setCatActiva] = useState('todas');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Producto | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [newCat, setNewCat] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imagenUrl, setImagenUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: productos = [] } = useQuery<Producto[]>({ queryKey: ['productos'], queryFn: menuService.getProductos });
  const { data: categorias = [] } = useQuery<Categoria[]>({ queryKey: ['categorias'], queryFn: menuService.getCategorias });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { disponible: true, requiereCocina: true },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    setUploading(true);
    try {
      const { url } = await menuService.uploadImagen(file);
      setImagenUrl(url);
      toast.success('Imagen subida');
    } catch {
      toast.error('Error al subir imagen');
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  };

  const save = useMutation({
    mutationFn: (data: FormData) => {
      const payload = { ...data, imagen: imagenUrl ?? (editing?.imagen ?? null) };
      return editing
        ? menuService.updateProducto(editing.id, payload)
        : menuService.createProducto(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['productos'] });
      closeModal();
      toast.success(editing ? 'Producto actualizado' : 'Producto creado');
    },
    onError: () => toast.error('Error al guardar producto'),
  });

  const del = useMutation({
    mutationFn: (id: string) => menuService.deleteProducto(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['productos'] }); toast.success('Producto eliminado'); },
    onError: () => toast.error('Error al eliminar'),
  });

  const addCat = useMutation({
    mutationFn: () => menuService.createCategoria(newCat.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categorias'] });
      setShowCatModal(false); setNewCat('');
      toast.success('Categoría creada');
    },
  });

  const openNew = () => {
    setEditing(null);
    setImagenUrl(null); setPreviewUrl(null);
    reset({ disponible: true, requiereCocina: true });
    setShowModal(true);
  };

  const openEdit = (p: Producto) => {
    setEditing(p);
    setImagenUrl(p.imagen ?? null);
    setPreviewUrl(p.imagen ?? null);
    reset({
      nombre: p.nombre,
      descripcion: p.descripcion ?? '',
      precio: Number(p.precio),
      categoriaId: p.categoriaId,
      disponible: p.disponible,
      requiereCocina: p.requiereCocina,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false); setEditing(null);
    setImagenUrl(null); setPreviewUrl(null);
    reset();
  };

  const visible = productos.filter((p) =>
    (catActiva === 'todas' || p.categoriaId === catActiva) &&
    (!search || p.nombre.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar producto..."
              className="bg-muted border border-border rounded-lg pl-8 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary w-52" />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setCatActiva('todas')}
              className={cn('px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                catActiva === 'todas' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:text-foreground')}>
              Todas ({productos.length})
            </button>
            {categorias.map((c) => (
              <button key={c.id} onClick={() => setCatActiva(c.id)}
                className={cn('px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                  catActiva === c.id ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:text-foreground')}>
                {c.nombre}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setShowCatModal(true)}>
            <Plus size={14} /> Categoría
          </Button>
          <Button size="sm" onClick={openNew}>
            <Plus size={14} /> Nuevo Producto
          </Button>
        </div>
      </div>

      {/* Grid de productos */}
      {visible.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ChefHat size={40} className="mx-auto mb-3 opacity-20" />
          <p>No hay productos. ¡Crea el primero!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {visible.map((prod) => (
            <div key={prod.id} className="bg-card border border-border rounded-xl overflow-hidden flex flex-col group">
              {/* Imagen */}
              <div className="relative h-36 bg-muted overflow-hidden">
                {prod.imagen ? (
                  <img src={prod.imagen} alt={prod.nombre}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/40">
                    <ImagePlus size={28} />
                    <span className="text-xs mt-1">Sin imagen</span>
                  </div>
                )}
                {/* Badge cocina/complemento */}
                <div className={cn(
                  'absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1',
                  prod.requiereCocina
                    ? 'bg-warning/90 text-background'
                    : 'bg-info/90 text-background'
                )}>
                  {prod.requiereCocina ? <><ChefHat size={10} /> Cocina</> : <><Coffee size={10} /> Complemento</>}
                </div>
              </div>

              <div className="p-3 flex flex-col gap-1.5 flex-1">
                <div className="flex items-start justify-between gap-1">
                  <p className="text-sm font-semibold text-foreground line-clamp-2 flex-1">{prod.nombre}</p>
                  <StatusBadge variant={prod.disponible ? 'activo' : 'inactivo'} />
                </div>
                {prod.descripcion && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{prod.descripcion}</p>
                )}
                <p className="text-primary font-bold text-base">{formatCurrency(Number(prod.precio))}</p>
                <p className="text-xs text-muted-foreground">{prod.categoria?.nombre}</p>

                <div className="flex gap-1.5 mt-auto pt-1">
                  <button onClick={() => openEdit(prod)}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-muted text-xs text-muted-foreground hover:text-foreground rounded-lg transition-colors">
                    <Pencil size={11} /> Editar
                  </button>
                  <button onClick={() => { if (confirm('¿Eliminar este producto?')) del.mutate(prod.id); }}
                    className="px-2.5 py-1.5 bg-error/10 text-error text-xs rounded-lg hover:bg-error/20 transition-colors">
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal producto */}
      <Modal open={showModal} onClose={closeModal} title={editing ? 'Editar Producto' : 'Nuevo Producto'}>
        <form onSubmit={handleSubmit((d) => save.mutate(d))} className="space-y-4">

          {/* Upload imagen */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Imagen del producto</label>
            <div
              className="relative h-28 rounded-xl border-2 border-dashed border-border bg-muted overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {previewUrl ? (
                <img src={previewUrl} alt="preview" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <ImagePlus size={28} className="mb-2" />
                  <span className="text-sm">Haz clic para subir imagen</span>
                  <span className="text-xs mt-1">JPG, PNG, WebP · máx 5 MB</span>
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                  <div className="text-sm text-foreground font-medium animate-pulse">Subiendo...</div>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            {previewUrl && (
              <button type="button" onClick={() => { setPreviewUrl(null); setImagenUrl(null); }}
                className="text-xs text-error mt-1 hover:underline">
                Quitar imagen
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-sm font-medium text-foreground block mb-1.5">Nombre *</label>
              <input {...register('nombre')}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary" />
              {errors.nombre && <p className="text-xs text-error mt-1">{errors.nombre.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Precio (S/) *</label>
              <input type="number" step="0.01" {...register('precio', { valueAsNumber: true })}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary" />
              {errors.precio && <p className="text-xs text-error mt-1">{errors.precio.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Categoría *</label>
              <select {...register('categoriaId')}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary">
                <option value="">Seleccionar...</option>
                {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              {errors.categoriaId && <p className="text-xs text-error mt-1">{errors.categoriaId.message}</p>}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Descripción</label>
            <textarea {...register('descripcion')} rows={2}
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary resize-none" />
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register('disponible')} className="accent-primary w-4 h-4" />
              <span className="text-sm text-foreground">Disponible</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register('requiereCocina')} className="accent-warning w-4 h-4" />
              <span className="text-sm text-foreground flex items-center gap-1">
                <ChefHat size={13} className="text-warning" /> Va a cocina
              </span>
            </label>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            Desmarca "Va a cocina" para complementos (gaseosas, salsas, etc.) que el mesero sirve directamente.
          </p>

          <div className="flex gap-3 pt-1">
            <Button variant="secondary" type="button" className="flex-1" onClick={closeModal}>Cancelar</Button>
            <Button type="submit" className="flex-1" loading={isSubmitting || uploading}>
              {editing ? 'Actualizar' : 'Crear producto'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal nueva categoría */}
      <Modal open={showCatModal} onClose={() => { setShowCatModal(false); setNewCat(''); }} title="Nueva Categoría">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Nombre de la categoría</label>
            <input value={newCat} onChange={(e) => setNewCat(e.target.value)}
              placeholder="Ej: Combos, Bebidas, Ensaladas..."
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
              onKeyDown={(e) => e.key === 'Enter' && newCat.trim() && addCat.mutate()} />
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => { setShowCatModal(false); setNewCat(''); }}>Cancelar</Button>
            <Button className="flex-1" loading={addCat.isPending} disabled={!newCat.trim()} onClick={() => addCat.mutate()}>
              Crear categoría
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
