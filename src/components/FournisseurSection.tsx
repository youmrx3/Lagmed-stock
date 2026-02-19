import { useMemo, useState } from "react";
import { Fournisseur, StockItem } from "@/types/stock";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, Plus, Edit2, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";

interface FournisseurSectionProps {
  fournisseurs: Fournisseur[];
  items: StockItem[];
  currency: string;
  onAdd: (payload: Partial<Fournisseur>) => Promise<void>;
  onUpdate: (id: string, payload: Partial<Fournisseur>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("fr-DZ", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(value);
}

export function FournisseurSection({ fournisseurs, items, currency, onAdd, onUpdate, onDelete }: FournisseurSectionProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingFournisseur, setEditingFournisseur] = useState<Fournisseur | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedFournisseur, setSelectedFournisseur] = useState<Fournisseur | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  });

  const getFournisseurMetrics = (fournisseurId: string) => {
    const fItems = items.filter((item) => item.fournisseur_id === fournisseurId);
    const totalValue = fItems.reduce((sum, item) => sum + (item.price_ht || 0) * item.quantity, 0);
    const totalPaid = fItems.reduce((sum, item) => sum + (item.paid_amount || 0), 0);
    const totalDue = Math.max(0, totalValue - totalPaid);
    return { fItems, totalValue, totalPaid, totalDue };
  };

  const totalGlobalValue = useMemo(() => {
    return fournisseurs.reduce((sum, f) => {
      const fItems = items.filter((item) => item.fournisseur_id === f.id);
      return sum + fItems.reduce((acc, item) => acc + (item.price_ht || 0) * item.quantity, 0);
    }, 0);
  }, [fournisseurs, items]);

  const filteredFournisseurs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return fournisseurs;
    return fournisseurs.filter((f) => {
      const fText = [f.name, f.email, f.phone, f.address, f.notes].filter(Boolean).join(" ").toLowerCase();
      const fItems = items.filter((item) => item.fournisseur_id === f.id);
      const productsText = fItems.map((item) => [item.description, item.reference].filter(Boolean).join(" ")).join(" ").toLowerCase();
      return fText.includes(query) || productsText.includes(query);
    });
  }, [fournisseurs, items, searchTerm]);

  const openAddForm = () => {
    setEditingFournisseur(null);
    setFormData({ name: "", email: "", phone: "", address: "", notes: "" });
    setFormOpen(true);
  };

  const openEditForm = (f: Fournisseur) => {
    setEditingFournisseur(f);
    setFormData({
      name: f.name || "",
      email: f.email || "",
      phone: f.phone || "",
      address: f.address || "",
      notes: f.notes || "",
    });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Le nom du fournisseur est requis");
      return;
    }

    if (editingFournisseur) {
      await onUpdate(editingFournisseur.id, formData);
    } else {
      await onAdd(formData);
    }
    setFormOpen(false);
  };

  const openDetails = (f: Fournisseur) => {
    setSelectedFournisseur(f);
    setDetailOpen(true);
  };

  const confirmDelete = async () => {
    if (deleteId) {
      await onDelete(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4 transition-all hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Truck className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Fournisseurs enregistrés</p>
              <p className="text-lg font-bold tracking-tight">{fournisseurs.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 transition-all hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Fournisseurs affichés</p>
              <p className="text-lg font-bold tracking-tight">{filteredFournisseurs.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 transition-all hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-warning/10 flex items-center justify-center">
              <Truck className="h-4 w-4 text-warning" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Valeur totale achats</p>
              <p className="text-lg font-bold tracking-tight">{formatMoney(totalGlobalValue, currency)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add button + Search */}
      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b bg-muted/30">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Truck className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-semibold text-sm">Gestion des fournisseurs</h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-[260px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher fournisseur..."
                  className="pl-9 h-9 text-sm bg-background"
                />
              </div>
              <Button onClick={openAddForm} size="sm" className="gap-1.5 whitespace-nowrap h-9 gradient-primary border-0 text-white shadow-sm">
                <Plus className="h-3.5 w-3.5" />
                Ajouter
              </Button>
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-5">
          {filteredFournisseurs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">Aucun fournisseur enregistré.</p>
          ) : (
            <div className="space-y-3">
              {filteredFournisseurs.map((f) => {
                const { fItems, totalValue, totalDue } = getFournisseurMetrics(f.id);
                return (
                  <div
                    key={f.id}
                    className="rounded-xl border p-4 space-y-3 cursor-pointer hover:bg-muted/20 hover:shadow-sm transition-all"
                    onClick={() => openDetails(f)}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Truck className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{f.name}</p>
                          <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                            {f.email && <span>{f.email}</span>}
                            {f.phone && <span>• {f.phone}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className="text-xs">{fItems.length} produits</Badge>
                        <Badge variant="outline" className="text-xs">{formatMoney(totalValue, currency)}</Badge>
                        {totalDue > 0 && (
                          <Badge variant="warning" className="text-xs">Dû: {formatMoney(totalDue, currency)}</Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg"
                          onClick={(e) => { e.stopPropagation(); openEditForm(f); }}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => { e.stopPropagation(); setDeleteId(f.id); }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {fItems.length > 0 && (
                      <div className="space-y-1 pt-1">
                        {fItems.slice(0, 3).map((item) => (
                          <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/30 px-3 py-1.5 text-xs">
                            <p className="font-medium">#{item.number} - {item.description}</p>
                            <p className="text-muted-foreground tabular-nums">{formatMoney((item.price_ht || 0) * item.quantity, currency)}</p>
                          </div>
                        ))}
                        {fItems.length > 3 && (
                          <p className="text-xs text-muted-foreground text-center">+{fItems.length - 3} autres produits</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingFournisseur ? "Modifier le fournisseur" : "Ajouter un fournisseur"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="f-name">Nom *</Label>
              <Input
                id="f-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nom du fournisseur"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="f-email">Email</Label>
                <Input
                  id="f-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="f-phone">Téléphone</Label>
                <Input
                  id="f-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+213..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-address">Adresse</Label>
              <Input
                id="f-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Adresse du fournisseur"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-notes">Notes</Label>
              <Textarea
                id="f-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notes..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmit}>{editingFournisseur ? "Mettre à jour" : "Ajouter"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
          {selectedFournisseur && (() => {
            const { fItems, totalValue, totalPaid, totalDue } = getFournisseurMetrics(selectedFournisseur.id);
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="text-lg">Détails du fournisseur</DialogTitle>
                </DialogHeader>
                <div className="space-y-5">
                  <div className="rounded-xl border p-4 space-y-1">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Truck className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{selectedFournisseur.name}</p>
                        {selectedFournisseur.email && <p className="text-sm text-muted-foreground">{selectedFournisseur.email}</p>}
                      </div>
                    </div>
                    {selectedFournisseur.phone && <p className="text-sm text-muted-foreground mt-2">{selectedFournisseur.phone}</p>}
                    {selectedFournisseur.address && <p className="text-sm text-muted-foreground">{selectedFournisseur.address}</p>}
                    {selectedFournisseur.notes && <p className="text-sm mt-2">{selectedFournisseur.notes}</p>}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl border p-3">
                      <p className="text-xs font-medium text-muted-foreground">Valeur totale</p>
                      <p className="text-lg font-bold tracking-tight mt-0.5">{formatMoney(totalValue, currency)}</p>
                    </div>
                    <div className="rounded-xl border p-3">
                      <p className="text-xs font-medium text-muted-foreground">Total versé</p>
                      <p className="text-lg font-bold tracking-tight mt-0.5 text-success">{formatMoney(totalPaid, currency)}</p>
                    </div>
                    <div className="rounded-xl border p-3">
                      <p className="text-xs font-medium text-muted-foreground">Reste à payer</p>
                      <p className="text-lg font-bold tracking-tight mt-0.5 text-warning">{formatMoney(totalDue, currency)}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <h4 className="font-medium">Produits fournis ({fItems.length})</h4>
                    {fItems.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Aucun produit associé à ce fournisseur.</p>
                    ) : (
                      fItems.map((item) => {
                        const itemTotal = (item.price_ht || 0) * item.quantity;
                        const itemDue = Math.max(0, itemTotal - (item.paid_amount || 0));
                        return (
                          <div key={item.id} className="rounded-md border p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="font-medium">#{item.number} - {item.description}</p>
                                {item.reference && <p className="text-xs text-muted-foreground">Réf: {item.reference}</p>}
                              </div>
                              <Badge variant={itemDue > 0 ? "warning" : "success"}>
                                {itemDue > 0 ? "Partiellement payé" : "Soldé"}
                              </Badge>
                            </div>
                            <div className="mt-1 text-sm text-muted-foreground">
                              Qté: {item.quantity} • Prix: {formatMoney(item.price_ht || 0, currency)} • Total: {formatMoney(itemTotal, currency)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Versé: {formatMoney(item.paid_amount || 0, currency)} • Reste: {formatMoney(itemDue, currency)}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le fournisseur</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce fournisseur ? Les produits liés ne seront pas supprimés mais perdront l'association.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
