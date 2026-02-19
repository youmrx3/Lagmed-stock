import { StockItem, CustomField } from "@/types/stock";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, Image as ImageIcon, Package } from "lucide-react";

interface StockTableProps {
  items: StockItem[];
  customFields: CustomField[];
  onEdit: (item: StockItem) => void;
  onDelete: (id: string) => void;
  onViewDetail: (item: StockItem) => void;
}

function getStockStatus(remaining: number, quantity: number) {
  if (remaining === 0) return { label: "Rupture", variant: "destructive" as const, dot: "bg-destructive" };
  if (remaining <= quantity * 0.2) return { label: "Stock bas", variant: "warning" as const, dot: "bg-warning" };
  return { label: "En stock", variant: "success" as const, dot: "bg-success" };
}

export function StockTable({ items, customFields, onEdit, onDelete, onViewDetail }: StockTableProps) {
  const formatPrice = (price: number | null) => {
    if (price === null) return "—";
    return new Intl.NumberFormat("fr-DZ", {
      style: "currency",
      currency: "DZD",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const activeCustomFields = customFields.filter(f => f.is_active);

  const getCustomFieldValue = (item: StockItem, fieldId: string) => {
    const cfv = item.custom_field_values?.find(v => v.custom_field_id === fieldId);
    return cfv?.value || "—";
  };

  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40 border-b">
              <TableHead className="w-14 font-semibold text-xs uppercase tracking-wider text-muted-foreground">N°</TableHead>
              <TableHead className="w-20 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Image</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground min-w-[160px]">Description</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Réf.</TableHead>
              <TableHead className="text-center font-semibold text-xs uppercase tracking-wider text-muted-foreground w-16">Qté</TableHead>
              <TableHead className="text-center font-semibold text-xs uppercase tracking-wider text-muted-foreground w-16">Rés.</TableHead>
              <TableHead className="text-center font-semibold text-xs uppercase tracking-wider text-muted-foreground w-16">Disp.</TableHead>
              <TableHead className="text-right font-semibold text-xs uppercase tracking-wider text-muted-foreground">Prix HT</TableHead>
              <TableHead className="text-right font-semibold text-xs uppercase tracking-wider text-muted-foreground">Versé</TableHead>
              <TableHead className="text-right font-semibold text-xs uppercase tracking-wider text-muted-foreground">Reste</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Client</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Fourn.</TableHead>
              {activeCustomFields.map(field => (
                <TableHead key={field.id} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                  {field.name}
                </TableHead>
              ))}
              <TableHead className="text-center font-semibold text-xs uppercase tracking-wider text-muted-foreground w-24">Statut</TableHead>
              <TableHead className="w-20 font-semibold text-xs uppercase tracking-wider text-muted-foreground"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const status = getStockStatus(item.remaining, item.quantity);
              const productImage = item.product_images?.[0]?.image_url || item.image_url;
              const total = (item.price_ht || 0) * item.quantity;
              const due = Math.max(0, total - (item.paid_amount || 0));
              return (
                <TableRow key={item.id} className="group cursor-pointer hover:bg-muted/30 transition-colors border-b border-border/50" onClick={() => onViewDetail(item)}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {item.number}
                  </TableCell>
                  <TableCell className="py-2">
                    {productImage ? (
                      <img
                        src={productImage}
                        alt={item.description}
                        className="w-12 h-12 object-cover rounded-lg border shadow-sm"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg border bg-muted/50 flex items-center justify-center">
                        <ImageIcon className="h-4 w-4 text-muted-foreground/50" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <p className="font-medium text-sm leading-tight">{item.description}</p>
                      {item.notes && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{item.notes}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.reference ? (
                      <code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">
                        {item.reference}
                      </code>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center font-medium text-sm tabular-nums">{item.quantity}</TableCell>
                  <TableCell className="text-center text-sm tabular-nums">
                    {item.reserved > 0 ? (
                      <span className="text-warning font-medium">{item.reserved}</span>
                    ) : (
                      <span className="text-muted-foreground/50">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center font-medium text-sm tabular-nums">{item.remaining}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{formatPrice(item.price_ht)}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums text-success">{formatPrice(item.paid_amount || 0)}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums text-warning">{formatPrice(due)}</TableCell>
                  <TableCell className="text-sm">{item.client?.name || item.client?.email || <span className="text-muted-foreground/50">—</span>}</TableCell>
                  <TableCell className="text-sm">{item.fournisseur?.name || <span className="text-muted-foreground/50">—</span>}</TableCell>
                  {activeCustomFields.map(field => (
                    <TableCell key={field.id} className="text-sm">
                      {getCustomFieldValue(item, field.id)}
                    </TableCell>
                  ))}
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <div className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                      <span className="text-xs font-medium">{status.label}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg"
                        onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={14 + activeCustomFields.length} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                      <Package className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Aucun produit trouvé</p>
                      <p className="text-xs text-muted-foreground/70">Essayez de modifier vos filtres</p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
