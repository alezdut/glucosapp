import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput as RNTextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Plus, Search } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { theme } from "../theme";
import { createApiClient } from "../lib/api";
import type { FoodItem, FoodListItem as FoodListItemType } from "@glucosapp/types";
import type { HomeStackParamList } from "../navigation/HomeStackNavigator";
import TextInput from "../components/TextInput";
import Button from "../components/Button";
import FoodListItem from "../components/FoodListItem";
import ScreenHeader from "../components/ScreenHeader";

type CalculatorScreenNavigationProp = NativeStackNavigationProp<HomeStackParamList, "Calculator">;

/**
 * CalculatorScreen component - Search and add foods to calculate total carbs
 */
export default function CalculatorScreen() {
  const navigation = useNavigation<CalculatorScreenNavigationProp>();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [addedFoods, setAddedFoods] = useState<FoodListItemType[]>([]);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [quantity, setQuantity] = useState("");

  /**
   * Search for foods using the API
   */
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      return;
    }

    setSearching(true);
    try {
      const client = createApiClient();
      const response = await client.GET("/food-search", {
        params: { query: { q: searchQuery } },
      });

      if (response.error) {
        Alert.alert("Error", "No se pudo buscar alimentos");
        setSearchResults([]);
      } else {
        setSearchResults((response.data as FoodItem[]) || []);
      }
    } catch (error) {
      Alert.alert("Error", "Error al buscar alimentos");
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  /**
   * Add selected food to the list
   */
  const handleAddFood = () => {
    if (!selectedFood || !quantity || parseFloat(quantity) <= 0) {
      Alert.alert("Error", "Selecciona un alimento e ingresa la cantidad");
      return;
    }

    const quantityNum = parseFloat(quantity);
    const carbs = (selectedFood.carbohydratesPer100g * quantityNum) / 100;

    const newFood: FoodListItemType = {
      name: selectedFood.brand ? `${selectedFood.name} (${selectedFood.brand})` : selectedFood.name,
      quantity: quantityNum,
      carbohydrates: carbs,
    };

    setAddedFoods([...addedFoods, newFood]);
    setSelectedFood(null);
    setQuantity("");
    setSearchQuery("");
    setSearchResults([]);
  };

  /**
   * Remove food from the list
   */
  const handleDeleteFood = (index: number) => {
    setAddedFoods(addedFoods.filter((_, i) => i !== index));
  };

  /**
   * Calculate total carbohydrates
   */
  const totalCarbs = addedFoods.reduce((sum, food) => sum + food.carbohydrates, 0);

  /**
   * Navigate to Registrar screen with pre-filled carbs
   */
  const handleNavigateToRegistrar = () => {
    if (addedFoods.length === 0) {
      Alert.alert("Error", "Agrega al menos un alimento");
      return;
    }

    const mealName = addedFoods.map((f) => f.name).join(", ");
    navigation.getParent()?.navigate("Registrar", {
      carbohydrates: totalCarbs,
      mealName,
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <ScreenHeader title="Calcular" subtitle="Añadir Alimento" />

      {/* Search Section */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
          <RNTextInput
            style={styles.searchInput}
            placeholder="Buscar"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>

        {searching && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        )}

        {searchResults.length > 0 && (
          <View style={styles.resultsContainer}>
            {searchResults.map((food, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.resultItem, selectedFood === food && styles.resultItemSelected]}
                onPress={() => setSelectedFood(food)}
              >
                <Text style={styles.resultName}>{food.name}</Text>
                {food.brand && <Text style={styles.resultBrand}>{food.brand}</Text>}
                <Text style={styles.resultCarbs}>
                  {food.carbohydratesPer100g.toFixed(1)} g carbs / 100g
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Quantity Input */}
      {selectedFood && (
        <View style={styles.addSection}>
          <TextInput
            label="Cantidad"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="decimal-pad"
            placeholder="100"
            unit="g"
          />
          <Button
            title="Añadir"
            icon={<Plus size={20} color={theme.colors.background} />}
            onPress={handleAddFood}
          />
        </View>
      )}

      {/* Added Foods List */}
      {addedFoods.length > 0 && (
        <View style={styles.foodsSection}>
          <Text style={styles.sectionTitle}>Alimentos Registrados:</Text>
          {addedFoods.map((food, index) => (
            <FoodListItem key={index} item={food} onDelete={() => handleDeleteFood(index)} />
          ))}

          {/* Total Carbs */}
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Carbohidratos Totales:</Text>
            <Text style={styles.totalValue}>{totalCarbs.toFixed(1)} g</Text>
          </View>

          {/* Register Button */}
          <Button
            title="Registrar y volver"
            onPress={handleNavigateToRegistrar}
            style={styles.registerButton}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xxl,
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
    paddingVertical: theme.spacing.sm,
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
  },
  resultItem: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  resultItemSelected: {
    backgroundColor: theme.colors.primary + "20",
  },
  resultName: {
    fontSize: theme.fontSize.md,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  resultBrand: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  resultCarbs: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: "500",
  },
  addSection: {
    marginBottom: theme.spacing.lg,
  },
  foodsSection: {
    marginTop: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  totalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: theme.colors.primary + "20",
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  totalLabel: {
    fontSize: theme.fontSize.lg,
    fontWeight: "600",
    color: theme.colors.text,
  },
  totalValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: "bold",
    color: theme.colors.primary,
  },
  registerButton: {
    marginBottom: theme.spacing.xl,
  },
});
