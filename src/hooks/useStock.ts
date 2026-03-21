import { useState, useCallback, useMemo, useEffect } from "react";
import { StockItem, CustomField, StockStats, Client, Brand, Origin, Fournisseur, Category, PaymentTracking } from "@/types/stock";
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentTrackings, setPaymentTrackings] = useState<PaymentTracking[]>([]);
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
        .select("*")
        .order("number", { ascending: true });

      if (error) {
        console.error("Error fetching stock items:", error);
        throw error;
      }

      let items = ((data as unknown as StockItem[]) || []);

      // Fetch custom field values separately
      const { data: cfvData } = await supabase
        .from("custom_field_values")
        .select("id, stock_item_id, custom_field_id, value, custom_fields(id, name, field_type, is_active)");
      
      // Fetch product images separately
      const { data: imagesData } = await supabase
        .from("product_images")
        .select("id, stock_item_id, image_url, sort_order, created_at");

      // Fetch product sub-products separately
      const { data: subProductsData } = await supabase
        .from("product_sub_products")
        .select("id, parent_product_id, name, quantity, price, created_at, updated_at");

      // Attach custom field values
      items = items.map(item => ({
        ...item,
        custom_field_values: (cfvData || []).filter(cfv => cfv.stock_item_id === item.id) as any,
        product_images: (imagesData || []).filter(img => img.stock_item_id === item.id) as any,
        sub_products: (subProductsData || []).filter(sp => sp.parent_product_id === item.id) as any,
      }));

      // Fetch relationships separately
      const clientIds = [...new Set(items.map(i => i.client_id).filter(Boolean))];
      const brandIds = [...new Set(items.map(i => i.brand_id).filter(Boolean))];
      const originIds = [...new Set(items.map(i => i.origin_id).filter(Boolean))];
      const fournisseurIds = [...new Set(items.map(i => i.fournisseur_id).filter(Boolean))];
      const categoryIds = [...new Set(items.map(i => i.category_id).filter(Boolean))];

      let clients: any[] = [];
      let brands: any[] = [];
      let origins: any[] = [];
      let fournisseurs: any[] = [];
      let categories: any[] = [];

      if (clientIds.length > 0) {
        const { data: d } = await supabase.from("clients").select("*").in("id", clientIds);
        clients = d || [];
      }
      if (brandIds.length > 0) {
        const { data: d } = await supabase.from("brands").select("*").in("id", brandIds);
        brands = d || [];
      }
      if (originIds.length > 0) {
        const { data: d } = await supabase.from("origins").select("*").in("id", originIds);
        origins = d || [];
      }
      if (fournisseurIds.length > 0) {
        const { data: d } = await supabase.from("fournisseurs").select("*").in("id", fournisseurIds);
        fournisseurs = d || [];
      }
      if (categoryIds.length > 0) {
        const { data: d } = await supabase.from("categories").select("*").in("id", categoryIds);
        categories = d || [];
      }

      // Attach relationships
      items = items.map(item => ({
        ...item,
        paid_amount: item.paid_amount || 0,
        image_url: item.product_images?.[0]?.image_url || item.image_url || null,
        client: clients.find(c => c.id === item.client_id) || null,
        brand: brands.find(b => b.id === item.brand_id) || null,
        origin: origins.find(o => o.id === item.origin_id) || null,
        fournisseur: fournisseurs.find(f => f.id === item.fournisseur_id) || null,
        category: categories.find(c => c.id === item.category_id) || null,
        custom_field_values: item.custom_field_values,
        product_images: item.product_images,
        sub_products: item.sub_products,
      }));

      setItems(items);
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

  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        if (isMissingRelationError(error)) {
          setCategories([]);
          return;
        }
        throw error;
      }
      setCategories((data as Category[]) || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  }, []);

  const fetchPaymentTrackings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("payment_tracking")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        if (isMissingRelationError(error)) {
          setPaymentTrackings([]);
          return;
        }
        throw error;
      }

      setPaymentTrackings((data as unknown as PaymentTracking[]) || []);
    } catch (error) {
      console.error("Error fetching payment tracking:", error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchItems(),
        fetchCustomFields(),
        fetchClients(),
        fetchBrands(),
        fetchOrigins(),
        fetchFournisseurs(),
        fetchCategories(),
        fetchPaymentTrackings(),
      ]);
      setLoading(false);
    };
    loadData();
  }, [fetchItems, fetchCustomFields, fetchClients, fetchBrands, fetchOrigins, fetchFournisseurs, fetchCategories, fetchPaymentTrackings]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.reference || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.client?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.fournisseur?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.brand?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.origin?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.category?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
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
        category_id: item.category_id || null,
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
      await Promise.all([fetchItems(), fetchPaymentTrackings()]);
      toast.success("Produit ajouté avec succès");
      return inserted;
    } catch (error) {
      console.error("Error adding item:", error);
      toast.error("Erreur lors de l'ajout du produit");
      return null;
    }
  }, [fetchItems, fetchPaymentTrackings]);

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
        category_id: updates.category_id,
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
      await Promise.all([fetchItems(), fetchPaymentTrackings()]);
      toast.success("Produit mis à jour");
    } catch (error) {
      console.error("Error updating item:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  }, [fetchItems, fetchPaymentTrackings]);

  const deleteItem = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from("stock_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
      await Promise.all([fetchItems(), fetchPaymentTrackings()]);
      toast.success("Produit supprimé");
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("Erreur lors de la suppression");
    }
  }, [fetchItems, fetchPaymentTrackings]);

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

  // Sub-product management
  const addSubProduct = useCallback(async (parentProductId: string, name: string, quantity: number, price: number = 0) => {
    try {
      if (!name.trim()) {
        toast.error("Veuillez entrer un nom pour le sous-produit");
        return;
      }

      if (quantity <= 0) {
        toast.error("La quantité doit être supérieure à 0");
        return;
      }

      if (price < 0) {
        toast.error("Le prix ne peut pas être négatif");
        return;
      }

      const { error } = await supabase
        .from("product_sub_products")
        .insert({
          parent_product_id: parentProductId,
          name: name.trim(),
          quantity,
          price,
        });

      if (error) throw error;

      toast.success("Sous-produit ajouté");
      await fetchItems();
    } catch (error) {
      console.error("Error adding sub-product:", error);
      toast.error("Erreur lors de l'ajout du sous-produit");
    }
  }, [fetchItems]);

  const updateSubProduct = useCallback(async (subProductLinkId: string, quantity: number) => {
    try {
      if (quantity <= 0) {
        toast.error("La quantité doit être supérieure à 0");
        return;
      }

      const { error } = await supabase
        .from("product_sub_products")
        .update({ quantity })
        .eq("id", subProductLinkId);

      if (error) throw error;

      toast.success("Sous-produit mis à jour");
      await fetchItems();
    } catch (error) {
      console.error("Error updating sub-product:", error);
      toast.error("Erreur lors de la mise à jour du sous-produit");
    }
  }, [fetchItems]);

  const deleteSubProduct = useCallback(async (subProductLinkId: string) => {
    try {
      const { error } = await supabase
        .from("product_sub_products")
        .delete()
        .eq("id", subProductLinkId);

      if (error) throw error;

      toast.success("Sous-produit supprimé");
      await fetchItems();
    } catch (error) {
      console.error("Error deleting sub-product:", error);
      toast.error("Erreur lors de la suppression du sous-produit");
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

  // Category CRUD
  const addCategory = useCallback(async (cat: Partial<Category>) => {
    try {
      if (!cat.name?.trim()) {
        toast.error("Le nom de la catégorie est requis");
        return;
      }
      const { error } = await supabase.from("categories").insert({
        name: cat.name.trim(),
        image_url: cat.image_url || null,
      });
      if (error) throw error;
      await fetchCategories();
      toast.success("Catégorie ajoutée");
    } catch (error) {
      console.error("Error adding category:", error);
      if (isMissingRelationError(error)) {
        toast.error("Table categories manquante sur Supabase. Exécutez la migration SQL.");
        return;
      }
      toast.error("Erreur lors de l'ajout de la catégorie");
    }
  }, [fetchCategories]);

  const updateCategory = useCallback(async (id: string, updates: Partial<Category>) => {
    try {
      const { error } = await supabase
        .from("categories")
        .update({ name: updates.name, image_url: updates.image_url ?? null })
        .eq("id", id);
      if (error) throw error;
      await fetchCategories();
      toast.success("Catégorie mise à jour");
    } catch (error) {
      console.error("Error updating category:", error);
      toast.error("Erreur lors de la mise à jour de la catégorie");
    }
  }, [fetchCategories]);

  const deleteCategory = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
      await fetchCategories();
      await fetchItems();
      toast.success("Catégorie supprimée");
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Erreur lors de la suppression de la catégorie");
    }
  }, [fetchCategories, fetchItems]);

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
    const totalSubProducts = items.reduce((sum, item) => sum + (item.sub_products?.length || 0), 0);
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalReserved = items.reduce((sum, item) => sum + item.reserved, 0);
    const totalRemaining = items.reduce((sum, item) => sum + item.remaining, 0);
    const outOfStock = items.filter((item) => item.remaining === 0).length;
    const lowStock = items.filter((item) => item.remaining > 0 && item.remaining <= 5).length;
    const inStock = items.filter((item) => item.remaining > 5).length;
    const totalValue = items.reduce((sum, item) => sum + (item.price_ht || 0) * item.quantity, 0);

    // Category breakdown based on actual categories
    const categoryCounts: Record<string, number> = {};
    items.forEach(item => {
      const category = item.category?.name || "Sans catégorie";
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    const categoryBreakdown = Object.entries(categoryCounts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    const stockByStatus = [
      { status: "En stock", count: inStock, color: "hsl(var(--success))" },
      { status: "Stock bas", count: lowStock, color: "hsl(var(--warning))" },
      { status: "Rupture", count: outOfStock, color: "hsl(var(--destructive))" },
    ];

    return {
      totalItems,
      totalSubProducts,
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

  // Payment tracking management
  const addPaymentTracking = useCallback(async (
    clientId: string,
    productId: string | null,
    subProductId: string | null,
    amountWillingToPay: number,
    amountPaid: number = 0,
    notes: string = ""
  ) => {
    try {
      if (!clientId) {
        toast.error("Veuillez sélectionner un client");
        return;
      }

      if (!productId && !subProductId) {
        toast.error("Veuillez sélectionner un produit ou un sous-produit");
        return;
      }

      if (amountWillingToPay <= 0) {
        toast.error("Le montant doit être supérieur à 0");
        return;
      }

      const status = amountPaid === 0 ? "pending" : amountPaid >= amountWillingToPay ? "completed" : "partial";

      const { error } = await supabase.from("payment_tracking").insert({
        client_id: clientId,
        product_id: productId,
        sub_product_id: subProductId,
        amount_willing_to_pay: amountWillingToPay,
        amount_paid: amountPaid,
        status,
        notes,
      });

      if (error) throw error;
      toast.success("Suivi de paiement enregistré");
      await Promise.all([fetchItems(), fetchPaymentTrackings()]);
    } catch (error) {
      console.error("Error adding payment tracking:", error);
      toast.error("Erreur lors de l'enregistrement du suivi");
      throw error;
    }
  }, [fetchItems, fetchPaymentTrackings]);

  const updatePaymentTracking = useCallback(async (
    id: string,
    updates: {
      amount_paid?: number;
      amount_willing_to_pay?: number;
      status?: "pending" | "partial" | "completed";
      notes?: string;
    }
  ) => {
    try {
      let updateData: any = { ...updates };

      // Auto-calculate status based on amounts
      if (updates.amount_paid !== undefined) {
        const { data: record } = await supabase
          .from("payment_tracking")
          .select("amount_willing_to_pay")
          .eq("id", id)
          .single();

        if (record) {
          const totalAmount = updates.amount_willing_to_pay || record.amount_willing_to_pay;
          const paidAmount = updates.amount_paid;
          
          if (paidAmount === 0) {
            updateData.status = "pending";
          } else if (paidAmount >= totalAmount) {
            updateData.status = "completed";
          } else {
            updateData.status = "partial";
          }
        }
      }

      const { error } = await supabase
        .from("payment_tracking")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
      toast.success("Suivi de paiement mis à jour");
      await Promise.all([fetchItems(), fetchPaymentTrackings()]);
    } catch (error) {
      console.error("Error updating payment tracking:", error);
      toast.error("Erreur lors de la mise à jour");
      throw error;
    }
  }, [fetchItems, fetchPaymentTrackings]);

  const deletePaymentTracking = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from("payment_tracking")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Suivi de paiement supprimé");
      await Promise.all([fetchItems(), fetchPaymentTrackings()]);
    } catch (error) {
      console.error("Error deleting payment tracking:", error);
      toast.error("Erreur lors de la suppression");
      throw error;
    }
  }, [fetchItems, fetchPaymentTrackings]);

  return {
    items: filteredItems,
    allItems: items,
    customFields,
    clients,
    clientFeatureAvailable,
    brands,
    origins,
    fournisseurs,
    categories,
    paymentTrackings,
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
    addSubProduct,
    updateSubProduct,
    deleteSubProduct,
    addClient,
    updateClient,
    deleteClient,
    addBrand,
    updateBrand,
    deleteBrand,
    addOrigin,
    updateOrigin,
    deleteOrigin,
    addCategory,
    updateCategory,
    deleteCategory,
    addFournisseur,
    updateFournisseur,
    deleteFournisseur,
    addPaymentTracking,
    updatePaymentTracking,
    deletePaymentTracking,
    stats,
    refetch: async () => {
      await Promise.all([
        fetchItems(),
        fetchCustomFields(),
        fetchClients(),
        fetchBrands(),
        fetchOrigins(),
        fetchFournisseurs(),
        fetchCategories(),
        fetchPaymentTrackings(),
      ]);
    },
  };
}
