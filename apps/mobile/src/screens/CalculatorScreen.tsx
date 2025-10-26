import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput as RNTextInput,
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  Platform,
  UIManager,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { Plus, Minus, Search } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { theme } from "../theme";
import { createApiClient } from "../lib/api";
import type { FoodItem, FoodListItem as FoodListItemType } from "@glucosapp/types";
import type { RootStackParamList, RootTabParamList } from "../navigation/types";
import TextInput from "../components/TextInput";
import Button from "../components/Button";
import FoodListItem from "../components/FoodListItem";
import ScreenHeader from "../components/ScreenHeader";
import { useDebouncedSearch } from "../hooks";

type CalculatorScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<RootStackParamList, "Calculator">,
  BottomTabNavigationProp<RootTabParamList>
>;

// Extended type with unique ID for proper list handling
type FoodListItemWithId = FoodListItemType & { id: string };

/**
 * CalculatorScreen component - Create meal templates with food composition
 */
export default function CalculatorScreen() {
  const navigation = useNavigation<CalculatorScreenNavigationProp>();
  const [mealName, setMealName] = useState("");
  const [addedFoods, setAddedFoods] = useState<FoodListItemWithId[]>([]);
  const [quantity, setQuantity] = useState("100");
  const [saving, setSaving] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Ref for search input
  const searchInputRef = useRef<RNTextInput>(null);

  /**
   * Search function for the debounced hook
   */
  const searchFoods = useCallback(async (query: string): Promise<FoodItem[]> => {
    try {
      const client = createApiClient();
      const params = new URLSearchParams({ q: query.trim() });
      const response = await client.GET(`/food-search?${params.toString()}`);
      console.log("response", response);
      if (response.error) {
        Alert.alert("Error", "No se pudo buscar alimentos");
        return [];
      }
      return (response.data as FoodItem[]) || [];
    } catch (error) {
      Alert.alert("Error", "Error al buscar alimentos");
      return [];
    }
  }, []);

  // Use debounced search hook
  const { searchQuery, setSearchQuery, searchResults, isSearching, searchNow } = useDebouncedSearch<
    FoodItem[]
  >(searchFoods, 500);

  /**
   * Reset quantity and editing state when starting a new search
   */
  React.useEffect(() => {
    if (searchQuery) {
      setQuantity("100");
      setEditingIndex(null);
    }
  }, [searchQuery]);

  /**
   * Add selected food to the list directly when clicked
   */
  const handleSelectFood = (food: FoodItem) => {
    // Dismiss keyboard when selecting a food
    Keyboard.dismiss();

    const quantityNum = parseFloat(quantity) || 100;

    if (quantityNum <= 0) {
      Alert.alert("Error", "Ingresa una cantidad válida");
      return;
    }

    const carbs = Math.round(((food.carbohydratesPer100g * quantityNum) / 100) * 100) / 100;

    const newFood: FoodListItemWithId = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      name: food.brand ? `${food.name} (${food.brand})` : food.name,
      quantity: quantityNum,
      carbohydrates: carbs,
    };

    setAddedFoods([...addedFoods, newFood]);
    setSearchQuery("");
    setQuantity("100");
    setEditingIndex(null);
  };

  /**
   * Select a food item from the added list for editing
   */
  const handleEditFood = (index: number) => {
    const food = addedFoods[index];
    setEditingIndex(index);
    setQuantity(food.quantity.toString());
  };

  /**
   * Remove food from the list with animation
   */
  const handleDeleteFood = (id: string) => {
    // Configure animation for items moving up
    LayoutAnimation.configureNext({
      duration: 300,
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
      },
    });

    const deletedIndex = addedFoods.findIndex((food) => food.id === id);
    setAddedFoods(addedFoods.filter((food) => food.id !== id));

    if (editingIndex === deletedIndex) {
      setEditingIndex(null);
      setQuantity("100");
    }
  };

  /**
   * Increment quantity
   */
  const handleIncrementQuantity = () => {
    const current = parseFloat(quantity) || 0;
    const newQuantity = current + 10;
    setQuantity(newQuantity.toString());

    // If editing an existing food, update it
    if (editingIndex !== null) {
      updateEditingFood(newQuantity);
    }
  };

  /**
   * Decrement quantity
   */
  const handleDecrementQuantity = () => {
    const current = parseFloat(quantity) || 0;
    if (current > 10) {
      const newQuantity = current - 10;
      setQuantity(newQuantity.toString());

      // If editing an existing food, update it
      if (editingIndex !== null) {
        updateEditingFood(newQuantity);
      }
    }
  };

  /**
   * Update the quantity of the food being edited
   */
  const updateEditingFood = (newQuantity: number) => {
    if (editingIndex === null) return;

    const updatedFoods = [...addedFoods];
    const food = updatedFoods[editingIndex];
    const carbsPer100g = (food.carbohydrates / food.quantity) * 100;

    updatedFoods[editingIndex] = {
      ...food,
      quantity: newQuantity,
      carbohydrates: Math.round(((carbsPer100g * newQuantity) / 100) * 100) / 100,
    };

    setAddedFoods(updatedFoods);
  };

  /**
   * Handle manual quantity input change
   */
  const handleQuantityChange = (value: string) => {
    setQuantity(value);

    // If editing an existing food, update it in real-time
    if (editingIndex !== null) {
      const newQuantity = parseFloat(value);
      if (!isNaN(newQuantity) && newQuantity > 0) {
        updateEditingFood(newQuantity);
      }
    }
  };

  /**
   * Calculate total carbohydrates
   */
  const totalCarbs =
    Math.round(addedFoods.reduce((sum, food) => sum + food.carbohydrates, 0) * 100) / 100;

  /**
   * Reset form
   */
  const resetForm = () => {
    setMealName("");
    setSearchQuery("");
    setAddedFoods([]);
    setQuantity("100");
    setEditingIndex(null);
  };

  /**
   * Save meal template
   */
  const handleSaveMeal = async () => {
    // Validation
    if (!mealName.trim()) {
      Alert.alert("Error", "Ingresa el nombre del plato");
      return;
    }
    if (addedFoods.length === 0) {
      Alert.alert("Error", "Agrega al menos un alimento");
      return;
    }

    setSaving(true);
    try {
      const client = createApiClient();
      await client.POST("/meals", {
        body: {
          name: mealName,
          foodItems: addedFoods.map((f) => ({
            name: f.name,
            quantity: f.quantity,
            carbs: f.carbohydrates,
          })),
        },
      });

      Alert.alert("Éxito", "Plato guardado exitosamente", [
        {
          text: "OK",
          onPress: () => {
            resetForm();
            navigation.navigate("MainTabs", {
              screen: "Inicio",
              params: { screen: "Home" },
            });
          },
        },
      ]);
    } catch (error) {
      Alert.alert("Error", "No se pudo guardar el plato");
    } finally {
      setSaving(false);
    }
  };

  /**
   * Calculate and navigate to Registrar, optionally saving meal template
   */
  const handleCalculateOrSaveAndCalculate = async () => {
    // If no meal name, just navigate with carbs (calculate only)
    if (!mealName.trim()) {
      navigation.navigate("MainTabs", {
        screen: "Registrar",
        params: { carbohydrates: totalCarbs },
      });
      return;
    }

    // If meal name exists, validate and save before navigating
    if (addedFoods.length === 0) {
      Alert.alert("Error", "Agrega al menos un alimento");
      return;
    }

    setSaving(true);
    try {
      // Save meal template
      const client = createApiClient();
      await client.POST("/meals", {
        body: {
          name: mealName,
          foodItems: addedFoods.map((f) => ({
            name: f.name,
            quantity: f.quantity,
            carbs: f.carbohydrates,
          })),
        },
      });

      // Navigate to Registrar with carbs prefilled
      navigation.navigate("MainTabs", {
        screen: "Registrar",
        params: { carbohydrates: totalCarbs },
      });
    } catch (error) {
      Alert.alert("Error", "No se pudo guardar el plato");
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Calcular Carbohidratos" onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scrollableContent}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Meal Name Input */}
        <View style={styles.section}>
          <TextInput
            label="Nombre del plato"
            value={mealName}
            onChangeText={setMealName}
            placeholder="Ej: Desayuno completo"
          />
        </View>

        {/* Search Section */}
        <View style={styles.searchContainer}>
          <TouchableWithoutFeedback onPress={() => searchInputRef.current?.focus()}>
            <View style={styles.searchInputContainer}>
              <Search size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
              <RNTextInput
                ref={searchInputRef}
                style={styles.searchInput}
                placeholder="Buscar alimento..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={searchNow}
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>
          </TouchableWithoutFeedback>

          {/* Quantity Selector - Compact */}
          <View style={styles.quantitySectionCompact}>
            <Text style={styles.quantityLabelCompact}>Cantidad:</Text>
            <View style={styles.spacerCompact} />
            <TouchableOpacity
              style={styles.quantityButtonCompact}
              onPress={handleDecrementQuantity}
            >
              <Minus size={16} color={theme.colors.primary} />
            </TouchableOpacity>

            <RNTextInput
              style={styles.quantityInputCompact}
              value={quantity}
              onChangeText={handleQuantityChange}
              keyboardType="decimal-pad"
            />

            <TouchableOpacity
              style={styles.quantityButtonCompact}
              onPress={handleIncrementQuantity}
            >
              <Plus size={16} color={theme.colors.primary} />
            </TouchableOpacity>

            <Text style={styles.unitLabelCompact}>g</Text>
          </View>

          {isSearching && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          )}

          {searchResults && searchResults.length > 0 && (
            <ScrollView
              style={styles.resultsContainer}
              nestedScrollEnabled={true}
              onScrollBeginDrag={() => Keyboard.dismiss()}
              onMomentumScrollBegin={() => Keyboard.dismiss()}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
            >
              {searchResults.map((food, index) => (
                <TouchableOpacity
                  key={`${food.name}-${food.brand || "no-brand"}-${index}`}
                  style={styles.resultItem}
                  onPress={() => handleSelectFood(food)}
                >
                  <Text style={styles.resultName}>{food.name}</Text>
                  <View style={styles.resultSecondLine}>
                    <Text style={styles.resultBrand}>{food.brand || "Sin marca"}</Text>
                    <Text style={styles.resultCarbs}>
                      {food.carbohydratesPer100g.toFixed(2)} g / 100g
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </ScrollView>

      {/* Bottom Section - Always visible */}
      {(!searchResults || searchResults.length === 0) && (
        <View style={styles.bottomSection}>
          {/* Added Foods List - Scrollable */}
          {addedFoods.length > 0 && (
            <ScrollView style={styles.foodsScrollContainer} showsVerticalScrollIndicator={true}>
              {addedFoods
                .slice()
                .reverse()
                .map((food, reversedIndex) => {
                  const realIndex = addedFoods.length - 1 - reversedIndex;
                  return (
                    <FoodListItem
                      key={food.id}
                      item={food}
                      onDelete={() => handleDeleteFood(food.id)}
                      onPress={() => handleEditFood(realIndex)}
                      isSelected={editingIndex === realIndex}
                    />
                  );
                })}
            </ScrollView>
          )}

          {/* Total Carbs Display - Always visible */}
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total de carbohidratos</Text>
            <Text style={styles.totalValue}>{totalCarbs.toFixed(2)} g</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonsContainer}>
            {mealName.trim() && (
              <Button
                title="Guardar Plato"
                onPress={handleSaveMeal}
                loading={saving}
                disabled={addedFoods.length === 0}
                style={styles.actionButton}
              />
            )}

            <Button
              title={mealName.trim() ? "Guardar y calcular unidades" : "Calcular unidades"}
              variant="secondary"
              onPress={handleCalculateOrSaveAndCalculate}
              loading={saving}
              disabled={addedFoods.length === 0}
              style={mealName.trim() ? styles.lastActionButton : styles.actionButton}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollableContent: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  bottomSection: {
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    maxHeight: "50%",
  },
  foodsScrollContainer: {
    maxHeight: 200,
    marginBottom: theme.spacing.md,
  },
  buttonsContainer: {
    gap: theme.spacing.sm,
  },
  section: {
    marginBottom: theme.spacing.xs,
  },
  searchContainer: {
    marginBottom: theme.spacing.lg,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    height: 48,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
  },
  loadingContainer: {
    paddingVertical: theme.spacing.md,
    alignItems: "center",
  },
  resultsContainer: {
    marginTop: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
    maxHeight: 500,
  },
  resultItem: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  resultName: {
    fontSize: theme.fontSize.sm,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 4,
  },
  resultSecondLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resultBrand: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  resultCarbs: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: "500",
  },
  quantitySection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  quantityLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: "600",
    color: theme.colors.text,
    marginRight: theme.spacing.md,
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
  },
  quantityInput: {
    width: 80,
    height: 40,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.sm,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    textAlign: "center",
    backgroundColor: theme.colors.background,
    fontWeight: "600",
  },
  unitLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    fontWeight: "500",
  },
  quantitySectionCompact: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  quantityLabelCompact: {
    fontSize: theme.fontSize.sm,
    fontWeight: "600",
    color: theme.colors.text,
    marginRight: theme.spacing.sm,
  },
  quantityButtonCompact: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
  },
  quantityInputCompact: {
    width: 60,
    height: 32,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.xs,
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    textAlign: "center",
    backgroundColor: theme.colors.background,
    fontWeight: "600",
  },
  unitLabelCompact: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    fontWeight: "500",
  },
  spacerCompact: {
    flex: 1,
  },
  totalContainer: {
    backgroundColor: theme.colors.primary + "20",
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    fontWeight: "600",
    flex: 1,
  },
  totalValue: {
    fontSize: theme.fontSize.xxl,
    fontWeight: "bold",
    color: theme.colors.primary,
  },
  actionButton: {
    marginBottom: theme.spacing.sm,
  },
  lastActionButton: {
    marginBottom: theme.spacing.xs,
  },
});
