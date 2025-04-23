import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, where, doc, addDoc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useError, ERROR_TYPES } from './ErrorContext';

// Create budget context
const BudgetContext = createContext({
  budgets: [],
  loading: false,
  error: null,
  addBudget: () => {},
  updateBudget: () => {},
  deleteBudget: () => {},
  fetchBudgets: () => {},
  refreshBudgets: () => {},
  getMonthlyBudgets: () => {},
  getBudgetForCategory: () => {},
  getTotalBudgetForMonth: () => {}
});

export const BudgetProvider = ({ children }) => {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { showError } = useError();

  // Function to fetch all budgets for the current user
  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const user = auth.currentUser;
      if (!user) {
        setBudgets([]);
        setError('User not authenticated');
        return;
      }

      try {
        const budgetsRef = collection(db, 'budgets');
        const q = query(
          budgetsRef,
          where('userId', '==', user.uid)
        );

        const querySnapshot = await getDocs(q);
        const budgetsList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Sort by period (newest first) and then by category
        const sortedBudgets = budgetsList.sort((a, b) => {
          // Sort by period first (newest first)
          const periodComparison = b.period.localeCompare(a.period);
          if (periodComparison !== 0) return periodComparison;
          
          // Then sort by category name
          return a.category.localeCompare(b.category);
        });

        setBudgets(sortedBudgets);
      } catch (dbError) {
        console.error('Error in Firestore query:', dbError);
        // If collection doesn't exist or permissions issue, return empty array
        if (dbError.code === 'permission-denied' || 
            dbError.code === 'resource-exhausted' || 
            dbError.message.includes('Missing or insufficient permissions')) {
          console.log('Firebase collection might not exist yet or permissions issue');
          setBudgets([]);
        } else {
          // For other errors, set the error
          setError(`Failed to load budgets: ${dbError.message}`);
          showError('Failed to load budgets', ERROR_TYPES.ERROR);
        }
      }
    } catch (err) {
      console.error('Error fetching budgets:', err);
      setError('Failed to load budgets. Please try again.');
      showError('Failed to load budgets', ERROR_TYPES.ERROR);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  // Refresh budgets data
  const refreshBudgets = useCallback(() => {
    return fetchBudgets();
  }, [fetchBudgets]);

  // Add a new budget
  const addBudget = useCallback(async (budgetData) => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Validate required fields
    if (!budgetData.amount || !budgetData.category || !budgetData.period) {
      throw new Error('Budget requires amount, category, and period');
    }

    const now = new Date();
    const budgetWithMetadata = {
      ...budgetData,
      userId: user.uid,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    try {
      // Check if budget for this category and period already exists
      const existingBudget = budgets.find(b => 
        b.category === budgetData.category && b.period === budgetData.period
      );
      
      if (existingBudget) {
        throw new Error('A budget for this category already exists for the selected month');
      }

      const docRef = await addDoc(collection(db, 'budgets'), budgetWithMetadata);
      
      // Update local state
      setBudgets(prev => [
        { id: docRef.id, ...budgetWithMetadata },
        ...prev
      ]);
      
      return docRef.id;
    } catch (err) {
      console.error('Error adding budget:', err);
      showError('Failed to add budget: ' + err.message, ERROR_TYPES.ERROR);
      throw err;
    }
  }, [budgets, showError]);

  // Update an existing budget
  const updateBudget = useCallback(async (id, budgetData) => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const now = new Date();
    const updatedBudget = {
      ...budgetData,
      updatedAt: now.toISOString()
    };

    try {
      const budgetRef = doc(db, 'budgets', id);
      await updateDoc(budgetRef, updatedBudget);
      
      // Update local state
      setBudgets(prev => 
        prev.map(budget => 
          budget.id === id 
            ? { ...budget, ...updatedBudget } 
            : budget
        )
      );
    } catch (err) {
      console.error('Error updating budget:', err);
      showError('Failed to update budget', ERROR_TYPES.ERROR);
      throw err;
    }
  }, [showError]);

  // Delete a budget
  const deleteBudget = useCallback(async (id) => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const budgetRef = doc(db, 'budgets', id);
      await deleteDoc(budgetRef);
      
      // Update local state
      setBudgets(prev => prev.filter(budget => budget.id !== id));
    } catch (err) {
      console.error('Error deleting budget:', err);
      showError('Failed to delete budget', ERROR_TYPES.ERROR);
      throw err;
    }
  }, [showError]);

  // Helper to get budgets for a specific month
  const getMonthlyBudgets = useCallback((year, month) => {
    // Format period as "YYYY-MM"
    const periodKey = `${year}-${String(month).padStart(2, '0')}`;
    
    return budgets.filter(budget => budget.period === periodKey);
  }, [budgets]);

  // Helper to get budget for a specific category and period
  const getBudgetForCategory = useCallback((category, year, month) => {
    const periodKey = `${year}-${String(month).padStart(2, '0')}`;
    
    return budgets.find(budget => 
      budget.category === category && budget.period === periodKey
    );
  }, [budgets]);

  // Helper to get total budget amount for a month
  const getTotalBudgetForMonth = useCallback((year, month) => {
    const monthlyBudgets = getMonthlyBudgets(year, month);
    
    return monthlyBudgets.reduce((total, budget) => 
      total + Number(budget.amount), 0
    );
  }, [getMonthlyBudgets]);

  // Fetch budgets on mount and when auth changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        fetchBudgets();
      } else {
        setBudgets([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [fetchBudgets]);

  return (
    <BudgetContext.Provider
      value={{
        budgets,
        loading,
        error,
        addBudget,
        updateBudget,
        deleteBudget,
        fetchBudgets,
        refreshBudgets,
        getMonthlyBudgets,
        getBudgetForCategory,
        getTotalBudgetForMonth
      }}
    >
      {children}
    </BudgetContext.Provider>
  );
};

// Custom hook for using the budget context
export const useBudgets = () => {
  const context = useContext(BudgetContext);
  if (!context) {
    throw new Error('useBudgets must be used within a BudgetProvider');
  }
  return context;
};