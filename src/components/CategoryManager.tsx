import { useRef, useState } from "react";
import { Category } from "@/types/stock";
import { uploadProductImage } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Edit2, FolderOpen, ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

interface CategoryManagerProps {
  categories: Category[];
  onAdd: (payload: Partial<Category>) => Promise<void>;
  onUpdate: (id: string, payload: Partial<Category>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function CategoryManager({ categories, onAdd, onUpdate, onDelete }: CategoryManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ name: "", image_url: null as string | null });

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", image_url: null });
    setOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setForm({ name: cat.name, image_url: cat.image_url });
    setOpen(true);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image");
      return;
    }
    setUploading(true);
    const url = await uploadProductImage(file);
    setUploading(false);
    if (url) {
      setForm((prev) => ({ ...prev, image_url: url }));
      toast.success("Image téléchargée");
    } else {
      toast.error("Erreur lors du téléchargement");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (editing) {
      await onUpdate(editing.id, form);
    } else {
      await onAdd(form);
    }
    setOpen(false);
  };

  return (
    <>
      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Catégories</h3>
          </div>
          <Button size="sm" className="rounded-lg h-8 text-xs" onClick={openAdd}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Ajouter
          </Button>
        </div>
        <div className="p-4 sm:p-5">
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Aucune catégorie.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-muted/30 hover:shadow-sm transition-all"
                >
                  {cat.image_url ? (
                    <img src={cat.image_url} alt={cat.name} className="h-10 w-10 rounded-lg border object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-lg border flex items-center justify-center bg-muted">
                      <FolderOpen className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <p className="font-medium text-sm flex-1 truncate">{cat.name}</p>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(cat)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => onDelete(cat.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier la catégorie" : "Ajouter une catégorie"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} required />
            </div>

            <div className="space-y-2">
              <Label>Image</Label>
              <div className="flex items-center gap-3">
                {form.image_url ? (
                  <div className="relative">
                    <img src={form.image_url} alt="catégorie" className="w-16 h-16 object-cover rounded-xl border" />
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, image_url: null }))}
                      className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-16 h-16 border-2 border-dashed rounded-xl flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" size="sm" className="rounded-lg">Enregistrer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
