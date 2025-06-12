import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Download, Calendar, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPurchasesPy8Schema, type PurchasesPy8, type InsertPurchasesPy8 } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import BackToMenuButton from "@/components/BackToMenuButton";

// Authentic plant varieties for ΠΥ8 compliance
const PLANT_VARIETIES = [
  "Grapefruit", "Grapefruit Κόκκινο", "Florida King", "Passion fruit", "Swelle Crepe", 
  "Αβοκάτο", "Ακτινίδια", "Αμπέλι", "Αμυγδαλιά", "Αχλαδιά", "Αχλαδιά Super Fine", 
  "Αχλαδιά Κονφερενς", "Αχλαδιά Κόρσια", "Βελανιδιά", "Γλυκολεμονιά", "Γιαρμάς", 
  "Δαμασκηνιά", "Δαμασκηνιά Black Amber", "Δαμασκηνιά Black Diamond", "Δαμασκηνιά Stanley", 
  "Δασμασκινιά President", "Διάφορα", "Ελιά", "Ελιά Μοραγιόλου", "Ζιζιφιά", 
  "Καβάφα", "Καβάφα Άσπρη", "Καβάφα Κόκκινη", "Καϊσί", "Καρυδιά Κυπριακή", 
  "Καρυδιά Μοχώκ", "Καρυδιά Πεκάν", "Κερασιά", "Κερασιά Λαπέν", "Κιτρομηλιά", 
  "Κλήμα", "Κουμ Κουατ", "Κουρώ", "Κυδωνιά", "Λάιμ", "Λάιμ Κουατ", 
  "Λεμονιά Γιούρικα", "Λεμονιά Λαπήθου", "Λωτός", "Μάνγκο", "Μανταρινιά Καφφιν", 
  "Μανταρινιά Κλημεντίνη", "Μανταρινιά Νόβα", "Μανταρινιά Όρη", "Μανταρινιά Πίξι", 
  "Μαντόρα", "Μεσπηλιά", "Μηλιά", "Μηλιά California", "Μηλιά Golden Delicious", 
  "Μηλιά Granny Smith", "Μηλιά Royal Gala", "Μηλιά Άννα", "Μηλιά Καθηστό", 
  "Μορίγκα", "Μοσφυλιά Άγρια", "Μοσφυλιά Εμβολιασμένη", "Μπανανιά", "Μπεμπέκο", 
  "Νεκταρινιά", "Παπάγια", "Πετροκέραζο", "Περγαμόντο", "Πόμελο Chandler", 
  "Πόμελο Άσπρο", "Πομηλιά", "Πορτοκαλιά Βαλένσια", "Πορτοκαλιά Γιάφα", 
  "Πορτοκαλιά Μερλιν", "Πορτοκαλιά Navelina", "Πορτοκαλιά Κάρα Κάρα", 
  "Πορτοκαλιά Σανκγουινέλι", "Πορτοκαλιά Σιεκέρικο", "Πουρνέλα", "Ροδακινιά", 
  "Ροδακινιά Ούφο", "Ροδιά Wonderfull", "Ροδιά Σοκολάτα", "Ροδιά Φτανόφυλλη", 
  "Ροδιές", "Σιεριμόγια", "Συκαμιά", "Συκιά", "Συκιά - Βάρδικο", "Συκιά - Βασιλικό", 
  "Συκιά - Ναπολιτάνα Νέκρα", "Συκιά - Άγρια", "Συκιά - Σμυρνέικο", "Τυρίνθου", 
  "Τρεμιθιά", "Φεϊζόγια", "Φορμόζα", "Φορμόζα Πράσινη", "Χαλεπιανή", 
  "Χαρουπιά Άγρια", "Χαρουπιά Εμβολιασμένη", "Χρυσομηλιά"
];

// Authentic species categories for ΠΥ8 compliance
const PLANT_SPECIES = [
  "ΛΕΜΟΝΟΔΕΝΤΡΑ",
  "ΦΡΟΥΤΟΔΕΝΤΡΑ"
];

// Authentic categories (suppliers) for ΠΥ8 compliance
const PLANT_CATEGORIES = [
  "Chrysovalantis Nursuries Ltd",
  "Νίκος Γ. Μωυσής",
  "Φυτώρια Παναγιώτου Λτδ",
  "Τμήμα Γεωργίας",
  "Φυτώρια Ανδρέα Χαραλάμπους",
  "T. N. Theodorides Nurseries Ltd"
];

export default function Py8Purchases() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [varietySearchOpen, setVarietySearchOpen] = useState(false);
  const [speciesSearchOpen, setSpeciesSearchOpen] = useState(false);
  const [categorySearchOpen, setCategorySearchOpen] = useState(false);

  // Query for fetching purchases
  const { data: purchases = [], isLoading, isError } = useQuery<PurchasesPy8[]>({
    queryKey: ["/api/purchases-py8"],
  });

  // Form setup
  const form = useForm<InsertPurchasesPy8>({
    resolver: zodResolver(insertPurchasesPy8Schema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      species: "",
      variety: "",
      quantity: 0,
      documentsOrigin: "",
      category: "",
    },
  });

  // Mutation for creating purchases
  const createPurchaseMutation = useMutation({
    mutationFn: (data: InsertPurchasesPy8) => 
      apiRequest("/api/purchases-py8", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchases-py8"] });
      setIsAddModalOpen(false);
      form.reset();
      toast({
        title: "Επιτυχία",
        description: "Η καταχώριση αγοράς προστέθηκε επιτυχώς",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Σφάλμα",
        description: error.message || "Σφάλμα κατά την προσθήκη της καταχώρισης",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: InsertPurchasesPy8) => {
    createPurchaseMutation.mutate(values);
  };

  const handleExportExcel = () => {
    window.open("/api/reports/py8/excel", "_blank");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Σφάλμα κατά τη φόρτωση των δεδομένων</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ΠΥ8 - Καταχώριση Αγορών</h1>
          <p className="text-muted-foreground">
            Διαχείριση αγορών φυτικού υλικού από εγκεκριμένους παραγωγούς
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportExcel} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Εξαγωγή Excel
          </Button>
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Νέα Καταχώριση
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Προσθήκη Νέας Αγοράς</DialogTitle>
                <DialogDescription>
                  Συμπληρώστε τα στοιχεία της αγοράς φυτικού υλικού
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ημερομηνία</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="species"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Είδος</FormLabel>
                        <Popover open={speciesSearchOpen} onOpenChange={setSpeciesSearchOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={speciesSearchOpen}
                                className="w-full justify-between"
                              >
                                {field.value
                                  ? PLANT_SPECIES.find((species) => species === field.value) || field.value
                                  : "Επιλέξτε είδος..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0" align="start">
                            <Command>
                              <CommandInput 
                                placeholder="Αναζήτηση είδους ή πληκτρολογήστε νέο..." 
                                value={field.value || ""}
                                onValueChange={field.onChange}
                              />
                              <CommandList>
                                <CommandEmpty>
                                  <div className="p-2 text-sm">
                                    Δεν βρέθηκε είδος. Πατήστε Enter για να προσθέσετε "{field.value}"
                                  </div>
                                </CommandEmpty>
                                <CommandGroup>
                                  {PLANT_SPECIES.map((species) => (
                                    <CommandItem
                                      key={species}
                                      value={species}
                                      onSelect={() => {
                                        field.onChange(species);
                                        setSpeciesSearchOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={`mr-2 h-4 w-4 ${
                                          field.value === species ? "opacity-100" : "opacity-0"
                                        }`}
                                      />
                                      {species}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="variety"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Ποικιλία (Προαιρετικό)</FormLabel>
                        <Popover open={varietySearchOpen} onOpenChange={setVarietySearchOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={varietySearchOpen}
                                className="w-full justify-between"
                              >
                                {field.value && field.value !== "no_variety"
                                  ? PLANT_VARIETIES.find((variety) => variety === field.value) || field.value
                                  : field.value === "no_variety"
                                  ? "Χωρίς ποικιλία"
                                  : "Επιλέξτε ποικιλία..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0" align="start">
                            <Command>
                              <CommandInput 
                                placeholder="Αναζήτηση ποικιλίας ή πληκτρολογήστε νέα..." 
                                value={field.value === "no_variety" ? "" : (field.value || "")}
                                onValueChange={(value) => {
                                  if (value === "") {
                                    field.onChange("no_variety");
                                  } else {
                                    field.onChange(value);
                                  }
                                }}
                              />
                              <CommandList>
                                <CommandEmpty>
                                  <div className="p-2 text-sm">
                                    Δεν βρέθηκε ποικιλία. Πατήστε Enter για να προσθέσετε "{field.value}"
                                  </div>
                                </CommandEmpty>
                                <CommandGroup>
                                  <CommandItem
                                    value="no_variety"
                                    onSelect={() => {
                                      field.onChange("no_variety");
                                      setVarietySearchOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={`mr-2 h-4 w-4 ${
                                        field.value === "no_variety" ? "opacity-100" : "opacity-0"
                                      }`}
                                    />
                                    Χωρίς ποικιλία
                                  </CommandItem>
                                  {PLANT_VARIETIES.map((variety) => (
                                    <CommandItem
                                      key={variety}
                                      value={variety}
                                      onSelect={() => {
                                        field.onChange(variety);
                                        setVarietySearchOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={`mr-2 h-4 w-4 ${
                                          field.value === variety ? "opacity-100" : "opacity-0"
                                        }`}
                                      />
                                      {variety}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ποσότητα</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="documentsOrigin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Έγγραφα Προέλευσης (Προαιρετικό)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Στοιχεία παραστατικών" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Κατηγορία (Προαιρετικό)</FormLabel>
                        <Popover open={categorySearchOpen} onOpenChange={setCategorySearchOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={categorySearchOpen}
                                className="w-full justify-between"
                              >
                                {field.value && field.value !== "no_category"
                                  ? PLANT_CATEGORIES.find((category) => category === field.value) || field.value
                                  : field.value === "no_category"
                                  ? "Χωρίς κατηγορία"
                                  : "Επιλέξτε κατηγορία..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0" align="start">
                            <Command>
                              <CommandInput 
                                placeholder="Αναζήτηση κατηγορίας ή πληκτρολογήστε νέα..." 
                                value={field.value === "no_category" ? "" : (field.value || "")}
                                onValueChange={(value) => {
                                  if (value === "") {
                                    field.onChange("no_category");
                                  } else {
                                    field.onChange(value);
                                  }
                                }}
                              />
                              <CommandList>
                                <CommandEmpty>
                                  <div className="p-2 text-sm">
                                    Δεν βρέθηκε κατηγορία. Πατήστε Enter για να προσθέσετε "{field.value}"
                                  </div>
                                </CommandEmpty>
                                <CommandGroup>
                                  <CommandItem
                                    value="no_category"
                                    onSelect={() => {
                                      field.onChange("no_category");
                                      setCategorySearchOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={`mr-2 h-4 w-4 ${
                                        field.value === "no_category" ? "opacity-100" : "opacity-0"
                                      }`}
                                    />
                                    Χωρίς κατηγορία
                                  </CommandItem>
                                  {PLANT_CATEGORIES.map((category) => (
                                    <CommandItem
                                      key={category}
                                      value={category}
                                      onSelect={() => {
                                        field.onChange(category);
                                        setCategorySearchOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={`mr-2 h-4 w-4 ${
                                          field.value === category ? "opacity-100" : "opacity-0"
                                        }`}
                                      />
                                      {category}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsAddModalOpen(false)}
                    >
                      Ακύρωση
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createPurchaseMutation.isPending}
                    >
                      {createPurchaseMutation.isPending ? "Αποθήκευση..." : "Αποθήκευση"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Συνολικές Αγορές</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{purchases.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Συνολική Ποσότητα</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {purchases.reduce((sum, p) => sum + p.quantity, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Διαφορετικά Είδη</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(purchases.map(p => p.species)).size}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Τελευταία Αγορά</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {purchases.length > 0 ? purchases[0].date : "Καμία"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Καταχωρίσεις Αγορών</CardTitle>
          <CardDescription>
            Λίστα όλων των καταχωρίσεων αγορών φυτικού υλικού
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-4 py-2 text-left">Ημερομηνία</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Είδος</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Ποικιλία</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Ποσότητα</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Κατηγορία</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Έγγραφα</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2">{purchase.date}</td>
                    <td className="border border-gray-300 px-4 py-2">{purchase.species}</td>
                    <td className="border border-gray-300 px-4 py-2">{purchase.variety || "-"}</td>
                    <td className="border border-gray-300 px-4 py-2">{purchase.quantity}</td>
                    <td className="border border-gray-300 px-4 py-2">{purchase.category || "-"}</td>
                    <td className="border border-gray-300 px-4 py-2">
                      {purchase.documentsOrigin ? (
                        <span className="text-sm text-gray-600" title={purchase.documentsOrigin}>
                          {purchase.documentsOrigin.length > 30 
                            ? `${purchase.documentsOrigin.substring(0, 30)}...` 
                            : purchase.documentsOrigin}
                        </span>
                      ) : "-"}
                    </td>
                  </tr>
                ))}
                {purchases.length === 0 && (
                  <tr>
                    <td colSpan={6} className="border border-gray-300 px-4 py-8 text-center text-gray-500">
                      Δεν υπάρχουν καταχωρίσεις αγορών
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}