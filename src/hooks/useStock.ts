import { useState, useCallback, useMemo, useEffect } from "react";
import { StockItem, CustomField, StockStats, Client, Brand, Origin, Fournisseur } from "@/types/stock";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useStock() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientFeatureAvailable, setClientFeatureAvailable] = useState(true);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [origins, setOrigins] = useState<Origin[]>([]);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "in-stock" | "low-stock" | "out-of-stock">("all");

  const isMissingRelationError = (error: unknown) => {
    if (!error || typeof error !== "object") return false;
    const message = String((error as { message?: string }).message || "").toLowerCase();
    return message.includes("does not exist") || message.includes("column") || message.includes("relation") || message.includes("schema cache");
  };

  const isPermissionError = (error: unknown) => {
    if (!error || typeof error !== "object") return false;
    const message = String((error as { message?: string }).message || "").toLowerCase();
    return message.includes("row-level security") || message.includes("permission denied") || message.includes("not allowed");
  };

  const getErrorMessage = (error: unknown) => {
    if (!error || typeof error !== "object") return "Erreur inconnue";
    return String((error as { message?: string }).message || "Erreur inconnue");
  };

  // Fetch stock items
  const fetchItems = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("stock_items")
        .select(`
          *,
          custom_field_values (
            id,
            custom_field_id,
            value,
            custom_fields (
              id,
              name,
              field_type,
              is_active
            )
          ),
          product_images (
            id,
            stock_item_id,
            image_url,
            sort_order,
            created_at
          ),
          client:clients (
            id,
            name,
            email,
            phone,
            notes
          ),
          brand:brands (
            id,
            name,
            logo_url
          ),
          origin:origins (
            id,
            name,
            logo_url
          ),
          fournisseur:fournisseurs (
            id,
            name,
            email,
            phone,
            address,
            notes
          )
        `)
        .order("number", { ascending: true });

      if (error) {
        if (!isMissingRelationError(error)) throw error;

        const { data: legacyData, error: legacyError } = await supabase
          .from("stock_items")
          .select(`
            *,
            custom_field_values (
              id,
              custom_field_id,
              value,
              custom_fields (
                id,
                name,
                field_type,
                is_active
              )
            )
          `)
          .order("number", { ascending: true });

        if (legacyError) throw legacyError;

        const normalizedLegacy = ((legacyData as unknown as StockItem[]) || []).map((item) => ({
          ...item,
          paid_amount: item.paid_amount || 0,
          client_id: item.client_id || null,
          brand_id: item.brand_id || null,
          origin_id: item.origin_id || null,
          client: null,
          brand: null,
          origin: null,
          fournisseur: null,
          product_images: item.image_url ? [{ id: `legacy-${item.id}`, stock_item_id: item.id, image_url: item.image_url }] : [],
        }));

        setItems(normalizedLegacy);
        return;
      }

      const normalized = ((data as unknown as StockItem[]) || []).map((item) => {
        const productImages = [...(item.product_images || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        const firstImage = productImages[0]?.image_url || item.image_url;
        return {
          ...item,
          paid_amount: item.paid_amount || 0,
          image_url: firstImage || null,
          product_images: productImages,
        };
      });
      setItems(normalized);
    } catch (error) {
      console.error("Error fetching items:", error);
      toast.error("Erreur lors du chargement des produits");
    }
  }, []);

  // Fetch custom fields
  const fetchCustomFields = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("custom_fields")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setCustomFields(data || []);
    } catch (error) {
      console.error("Error fetching custom fields:", error);
    }
  }, []);

  const fetchClients = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        if (isMissingRelationError(error)) {
          setClients([]);
          setClientFeatureAvailable(false);
          return;
        }
        throw error;
      }
      setClients((data as Client[]) || []);
      setClientFeatureAvailable(true);
    } catch (error) {
      console.error("Error fetching clients:", error);
      if (isPermissionError(error)) {
        setClientFeatureAvailable(false);
      }
    }
  }, []);

  const fetchBrands = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("brands")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        if (isMissingRelationError(error)) {
          setBrands([]);
          return;
        }
        throw error;
      }
      setBrands((data as Brand[]) || []);
    } catch (error) {
      console.error("Error fetching brands:", error);
    }
  }, []);

  const fetchOrigins = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("origins")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        if (isMissingRelationError(error)) {
          setOrigins([]);
          return;
        }
        throw error;
      }
      setOrigins((data as Origin[]) || []);
    } catch (error) {
      console.error("Error fetching origins:", error);
    }
  }, []);

  const fetchFournisseurs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("fournisseurs")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        if (isMissingRelationError(error)) {
          setFournisseurs([]);
          return;
        }
        throw error;
      }
      setFournisseurs((data as Fournisseur[]) || []);
    } catch (error) {
      console.error("Error fetching fournisseurs:", error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchItems(), fetchCustomFields(), fetchClients(), fetchBrands(), fetchOrigins(), fetchFournisseurs()]);
      setLoading(false);
    };
    loadData();
  }, [fetchItems, fetchCustomFields, fetchClients, fetchBrands, fetchOrigins, fetchFournisseurs]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.reference || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.client?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.fournisseur?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.brand?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.origin?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.number.toString().includes(searchTerm);

      let matchesFilter = true;
      if (filterStatus === "in-stock") {
        matchesFilter = item.remaining > 5;
      } else if (filterStatus === "low-stock") {
        matchesFilter = item.remaining > 0 && item.remaining <= 5;
      } else if (filterStatus === "out-of-stock") {
        matchesFilter = item.remaining === 0;
      }

      return matchesSearch && matchesFilter;
    });
  }, [items, searchTerm, filterStatus]);

  const addItem = useCallback(async (item: Omit<StockItem, "id" | "created_at" | "updated_at">) => {
    try {
      const insertPayload = {
        number: item.number,
        description: item.description,
        quantity: item.quantity,
        reference: item.reference || "",
        price_ht: item.price_ht,
        paid_amount: item.paid_amount || 0,
        client_id: item.client_id || null,
        brand_id: item.brand_id || null,
        origin_id: item.origin_id || null,
        fournisseur_id: item.fournisseur_id || null,
        reserved: item.reserved,
        remaining: item.remaining,
        notes: item.notes || "",
        image_url: item.image_url,
      };

      const { data, error } = await supabase
        .from("stock_items")
        .insert(insertPayload)
        .select()
        .single();

      let inserted = data;

      if (error) {
        if (!isMissingRelationError(error)) throw error;
        const { data: legacyInserted, error: legacyError } = await supabase
          .from("stock_items")
          .insert({
            number: item.number,
            description: item.description,
            quantity: item.quantity,
            reference: item.reference || "",
            price_ht: item.price_ht,
            reserved: item.reserved,
            remaining: item.remaining,
            notes: item.notes || "",
            image_url: item.image_url,
          })
          .select()
          .single();

        if (legacyError) throw legacyError;
        inserted = legacyInserted;
      }
      await fetchItems();
      toast.success("Produit ajouté avec succès");
      return inserted;
    } catch (error) {
      console.error("Error adding item:", error);
      toast.error("Erreur lors de l'ajout du produit");
      return null;
    }
  }, [fetchItems]);

  const updateItem = useCallback(async (id: string, updates: Partial<StockItem>) => {
    try {
      const payload = {
        number: updates.number,
        description: updates.description,
        quantity: updates.quantity,
        reference: updates.reference,
        price_ht: updates.price_ht,
        paid_amount: updates.paid_amount,
        client_id: updates.client_id,
        brand_id: updates.brand_id,
        origin_id: updates.origin_id,
        fournisseur_id: updates.fournisseur_id,
        reserved: updates.reserved,
        remaining: updates.remaining,
        notes: updates.notes,
        image_url: updates.image_url,
      };

      const { error } = await supabase
        .from("stock_items")
        .update(payload)
        .eq("id", id);

      if (error) {
        if (!isMissingRelationError(error)) throw error;
        const { error: legacyError } = await supabase
          .from("stock_items")
          .update({
            number: updates.number,
            description: updates.description,
            quantity: updates.quantity,
            reference: updates.reference,
            price_ht: updates.price_ht,
            reserved: updates.reserved,
            remaining: updates.remaining,
            notes: updates.notes,
            image_url: updates.image_url,
          })
          .eq("id", id);

        if (legacyError) throw legacyError;
      }
      await fetchItems();
      toast.success("Produit mis à jour");
    } catch (error) {
      console.error("Error updating item:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  }, [fetchItems]);

  const deleteItem = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from("stock_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
      await fetchItems();
      toast.success("Produit supprimé");
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("Erreur lors de la suppression");
    }
  }, [fetchItems]);

  // Custom fields management
  const addCustomField = useCallback(async (field: Omit<CustomField, "id" | "created_at">) => {
    try {
      const { error } = await supabase
        .from("custom_fields")
        .insert({
          name: field.name,
          field_type: field.field_type,
          is_active: field.is_active,
          display_order: field.display_order,
        });

      if (error) throw error;
      await fetchCustomFields();
      toast.success("Champ personnalisé ajouté");
    } catch (error) {
      console.error("Error adding custom field:", error);
      toast.error("Erreur lors de l'ajout du champ");
    }
  }, [fetchCustomFields]);

  const replaceProductImages = useCallback(async (stockItemId: string, imageUrls: string[]) => {
    try {
      const { error: deleteError } = await supabase
        .from("product_images")
        .delete()
        .eq("stock_item_id", stockItemId);

      if (deleteError && !isMissingRelationError(deleteError)) throw deleteError;

      if (imageUrls.length > 0) {
        const payload = imageUrls.map((imageUrl, index) => ({
          stock_item_id: stockItemId,
          image_url: imageUrl,
          sort_order: index,
        }));

        const { error: insertError } = await supabase
          .from("product_images")
          .insert(payload);

        if (insertError && !isMissingRelationError(insertError)) throw insertError;
      }

      const { error: updateError } = await supabase
        .from("stock_items")
        .update({ image_url: imageUrls[0] || null })
        .eq("id", stockItemId);

      if (updateError) throw updateError;

      await fetchItems();
    } catch (error) {
      console.error("Error replacing product images:", error);
      toast.error("Erreur lors de la mise à jour des images");
    }
  }, [fetchItems]);

  const addClient = useCallback(async (client: Partial<Client>) => {
    try {
      const hasName = Boolean(client.name?.trim());
      const hasEmail = Boolean(client.email?.trim());

      if (!hasName && !hasEmail) {
        toast.error("Ajoutez au moins le nom ou l'email du client");
        return;
      }

      const payload = {
        name: client.name?.trim() || null,
        email: client.email?.trim() || null,
        phone: client.phone?.trim() || null,
        notes: client.notes?.trim() || null,
      };

      const { error } = await supabase.from("clients").insert(payload);
      if (error) throw error;
      setClientFeatureAvailable(true);
      await fetchClients();
      toast.success("Client ajouté");
    } catch (error) {
      console.error("Error adding client:", error);
      if (isMissingRelationError(error)) {
        setClientFeatureAvailable(false);
        toast.error("Table clients manquante sur Supabase. Exécutez la migration SQL puis rechargez la page.");
        return;
      }
      if (isPermissionError(error)) {
        setClientFeatureAvailable(false);
        toast.error("Accès refusé à la table clients (RLS/policies). Vérifiez les policies Supabase.");
        return;
      }
      toast.error(`Erreur ajout client: ${getErrorMessage(error)}`);
    }
  }, [fetchClients]);

  const updateClient = useCallback(async (id: string, updates: Partial<Client>) => {
    try {
      const { error } = await supabase
        .from("clients")
        .update({
          name: updates.name ?? null,
          email: updates.email ?? null,
          phone: updates.phone ?? null,
          notes: updates.notes ?? null,
        })
        .eq("id", id);

      if (error) throw error;
      setClientFeatureAvailable(true);
      await fetchClients();
      toast.success("Client mis à jour");
    } catch (error) {
      console.error("Error updating client:", error);
      if (isMissingRelationError(error)) {
        setClientFeatureAvailable(false);
        toast.error("Table clients manquante sur Supabase.");
        return;
      }
      if (isPermissionError(error)) {
        setClientFeatureAvailable(false);
        toast.error("Accès refusé à la mise à jour client (RLS/policies).");
        return;
      }
      toast.error(`Erreur mise à jour client: ${getErrorMessage(error)}`);
    }
  }, [fetchClients]);

  const deleteClient = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
      setClientFeatureAvailable(true);
      await fetchClients();
      await fetchItems();
      toast.success("Client supprimé");
    } catch (error) {
      console.error("Error deleting client:", error);
      if (isMissingRelationError(error)) {
        setClientFeatureAvailable(false);
        toast.error("Table clients manquante sur Supabase.");
        return;
      }
      if (isPermissionError(error)) {
        setClientFeatureAvailable(false);
        toast.error("Accès refusé à la suppression client (RLS/policies).");
        return;
      }
      toast.error(`Erreur suppression client: ${getErrorMessage(error)}`);
    }
  }, [fetchClients, fetchItems]);

  const addBrand = useCallback(async (brand: Partial<Brand>) => {
    try {
      const { error } = await supabase.from("brands").insert({
        name: brand.name,
        logo_url: brand.logo_url || null,
      });
      if (error) throw error;
      await fetchBrands();
      toast.success("Marque ajoutée");
    } catch (error) {
      console.error("Error adding brand:", error);
      toast.error("Erreur lors de l'ajout de la marque");
    }
  }, [fetchBrands]);

  const updateBrand = useCallback(async (id: string, updates: Partial<Brand>) => {
    try {
      const { error } = await supabase
        .from("brands")
        .update({ name: updates.name, logo_url: updates.logo_url ?? null })
        .eq("id", id);
      if (error) throw error;
      await fetchBrands();
      toast.success("Marque mise à jour");
    } catch (error) {
      console.error("Error updating brand:", error);
      toast.error("Erreur lors de la mise à jour de la marque");
    }
  }, [fetchBrands]);

  const deleteBrand = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from("brands").delete().eq("id", id);
      if (error) throw error;
      await fetchBrands();
      await fetchItems();
      toast.success("Marque supprimée");
    } catch (error) {
      console.error("Error deleting brand:", error);
      toast.error("Erreur lors de la suppression de la marque");
    }
  }, [fetchBrands, fetchItems]);

  const addOrigin = useCallback(async (origin: Partial<Origin>) => {
    try {
      const { error } = await supabase.from("origins").insert({
        name: origin.name,
        logo_url: origin.logo_url || null,
      });
      if (error) throw error;
      await fetchOrigins();
      toast.success("Origine ajoutée");
    } catch (error) {
      console.error("Error adding origin:", error);
      toast.error("Erreur lors de l'ajout de l'origine");
    }
  }, [fetchOrigins]);

  const updateOrigin = useCallback(async (id: string, updates: Partial<Origin>) => {
    try {
      const { error } = await supabase
        .from("origins")
        .update({ name: updates.name, logo_url: updates.logo_url ?? null })
        .eq("id", id);
      if (error) throw error;
      await fetchOrigins();
      toast.success("Origine mise à jour");
    } catch (error) {
      console.error("Error updating origin:", error);
      toast.error("Erreur lors de la mise à jour de l'origine");
    }
  }, [fetchOrigins]);

  const deleteOrigin = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from("origins").delete().eq("id", id);
      if (error) throw error;
      await fetchOrigins();
      await fetchItems();
      toast.success("Origine supprimée");
    } catch (error) {
      console.error("Error deleting origin:", error);
      toast.error("Erreur lors de la suppression de l'origine");
    }
  }, [fetchOrigins, fetchItems]);

  // Fournisseur CRUD
  const addFournisseur = useCallback(async (fournisseur: Partial<Fournisseur>) => {
    try {
      if (!fournisseur.name?.trim()) {
        toast.error("Le nom du fournisseur est requis");
        return;
      }
      const { error } = await supabase.from("fournisseurs").insert({
        name: fournisseur.name.trim(),
        email: fournisseur.email?.trim() || null,
        phone: fournisseur.phone?.trim() || null,
        address: fournisseur.address?.trim() || null,
        notes: fournisseur.notes?.trim() || null,
      });
      if (error) throw error;
      await fetchFournisseurs();
      toast.success("Fournisseur ajouté");
    } catch (error) {
      console.error("Error adding fournisseur:", error);
      if (isMissingRelationError(error)) {
        toast.error("Table fournisseurs manquante sur Supabase. Exécutez la migration SQL.");
        return;
      }
      toast.error(`Erreur ajout fournisseur: ${getErrorMessage(error)}`);
    }
  }, [fetchFournisseurs]);

  const updateFournisseur = useCallback(async (id: string, updates: Partial<Fournisseur>) => {
    try {
      const { error } = await supabase
        .from("fournisseurs")
        .update({
          name: updates.name ?? undefined,
          email: updates.email ?? null,
          phone: updates.phone ?? null,
          address: updates.address ?? null,
          notes: updates.notes ?? null,
        })
        .eq("id", id);
      if (error) throw error;
      await fetchFournisseurs();
      toast.success("Fournisseur mis à jour");
    } catch (error) {
      console.error("Error updating fournisseur:", error);
      toast.error(`Erreur mise à jour fournisseur: ${getErrorMessage(error)}`);
    }
  }, [fetchFournisseurs]);

  const deleteFournisseur = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from("fournisseurs").delete().eq("id", id);
      if (error) throw error;
      await fetchFournisseurs();
      await fetchItems();
      toast.success("Fournisseur supprimé");
    } catch (error) {
      console.error("Error deleting fournisseur:", error);
      toast.error(`Erreur suppression fournisseur: ${getErrorMessage(error)}`);
    }
  }, [fetchFournisseurs, fetchItems]);

  const updateCustomField = useCallback(async (id: string, updates: Partial<CustomField>) => {
    try {
      const { error } = await supabase
        .from("custom_fields")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
      await fetchCustomFields();
      toast.success("Champ mis à jour");
    } catch (error) {
      console.error("Error updating custom field:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  }, [fetchCustomFields]);

  const deleteCustomField = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from("custom_fields")
        .delete()
        .eq("id", id);

      if (error) throw error;
      await fetchCustomFields();
      toast.success("Champ supprimé");
    } catch (error) {
      console.error("Error deleting custom field:", error);
      toast.error("Erreur lors de la suppression");
    }
  }, [fetchCustomFields]);

  // Update custom field value for an item
  const updateCustomFieldValue = useCallback(async (
    stockItemId: string, 
    customFieldId: string, 
    value: string
  ) => {
    try {
      const { error } = await supabase
        .from("custom_field_values")
        .upsert({
          stock_item_id: stockItemId,
          custom_field_id: customFieldId,
          value,
        }, {
          onConflict: "stock_item_id,custom_field_id"
        });

      if (error) throw error;
      await fetchItems();
    } catch (error) {
      console.error("Error updating custom field value:", error);
    }
  }, [fetchItems]);

  const stats: StockStats = useMemo(() => {
    const totalItems = items.length;
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalReserved = items.reduce((sum, item) => sum + item.reserved, 0);
    const totalRemaining = items.reduce((sum, item) => sum + item.remaining, 0);
    const outOfStock = items.filter((item) => item.remaining === 0).length;
    const lowStock = items.filter((item) => item.remaining > 0 && item.remaining <= 5).length;
    const inStock = items.filter((item) => item.remaining > 5).length;
    const totalValue = items.reduce((sum, item) => sum + (item.price_ht || 0) * item.quantity, 0);

    // Category breakdown based on description keywords
    const categories: Record<string, number> = {};
    items.forEach(item => {
      const desc = item.description.toLowerCase();
      let category = "Autre";
      if (desc.includes("incubator") || desc.includes("couveuse") || desc.includes("infant") || desc.includes("néonatal")) {
        category = "Néonatologie";
      } else if (desc.includes("aspirateur") || desc.includes("respirateur")) {
        category = "Respiratoire";
      } else if (desc.includes("morgue") || desc.includes("autopsy") || desc.includes("body bag")) {
        category = "Morgue";
      } else if (desc.includes("boite") || desc.includes("kit")) {
        category = "Instrumentation";
      } else if (desc.includes("table") || desc.includes("lit")) {
        category = "Mobilier";
      } else if (desc.includes("monitor") || desc.includes("ecg") || desc.includes("défibrillateur")) {
        category = "Monitoring";
      }
      categories[category] = (categories[category] || 0) + 1;
    });

    const categoryBreakdown = Object.entries(categories)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    const stockByStatus = [
      { status: "En stock", count: inStock, color: "hsl(var(--success))" },
      { status: "Stock bas", count: lowStock, color: "hsl(var(--warning))" },
      { status: "Rupture", count: outOfStock, color: "hsl(var(--destructive))" },
    ];

    return {
      totalItems,
      totalQuantity,
      totalReserved,
      totalRemaining,
      outOfStock,
      lowStock,
      totalValue,
      categoryBreakdown,
      stockByStatus,
    };
  }, [items]);

  return {
    items: filteredItems,
    allItems: items,
    customFields,
    clients,
    clientFeatureAvailable,
    brands,
    origins,
    fournisseurs,
    loading,
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    addItem,
    updateItem,
    deleteItem,
    addCustomField,
    updateCustomField,
    deleteCustomField,
    updateCustomFieldValue,
    replaceProductImages,
    addClient,
    updateClient,
    deleteClient,
    addBrand,
    updateBrand,
    deleteBrand,
    addOrigin,
    updateOrigin,
    deleteOrigin,
    addFournisseur,
    updateFournisseur,
    deleteFournisseur,
    stats,
    refetch: async () => {
      await Promise.all([fetchItems(), fetchCustomFields(), fetchClients(), fetchBrands(), fetchOrigins(), fetchFournisseurs()]);
    },
  };
}
