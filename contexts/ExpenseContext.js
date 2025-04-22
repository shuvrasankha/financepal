import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, where, doc, addDoc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useError, ERROR_TYPES } from './ErrorContext';

// Create expense context
const ExpenseContext = createContext({
  expenses: [],
  loading: false,
  error: null,
  addExpense: () => {},
  updateExpense: () => {},
  deleteExpense: () => {},
  fetchExpenses: () => {},
  refreshExpenses: () => {},
});

export const ExpenseProvider = ({ children }) => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { showError } = useError();

  // Function to fetch all expenses for the current user
  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const user = auth.currentUser;
      if (!user) {
        setExpenses([]);
        setError('User not authenticated');
        return;
      }

      // First try to fetch expenses with simpler query (no ordering)
      // to avoid requiring a composite index
      const expensesRef = collection(db, 'expenses');
      const q = query(
        expensesRef,
        where('userId', '==', user.uid)
      );

      const querySnapshot = await getDocs(q);
      const expensesList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Sort the data client-side instead of using orderBy in the query
      const sortedExpenses = expensesList.sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      );

      setExpenses(sortedExpenses);
    } catch (err) {
      console.error('Error fetching expenses:', err);
      setError('Failed to load expenses. Please try again.');
      showError('Failed to load expenses', ERROR_TYPES.ERROR);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  // Refresh expenses data
  const refreshExpenses = useCallback(() => {
    return fetchExpenses();
  }, [fetchExpenses]);

  // Add a new expense
  const addExpense = useCallback(async (expenseData) => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const now = new Date();
    const expenseWithMetadata = {
      ...expenseData,
      userId: user.uid,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    try {
      const docRef = await addDoc(collection(db, 'expenses'), expenseWithMetadata);
      
      // Update local state
      setExpenses(prev => [
        { id: docRef.id, ...expenseWithMetadata },
        ...prev
      ]);
      
      return docRef.id;
    } catch (err) {
      console.error('Error adding expense:', err);
      showError('Failed to add expense', ERROR_TYPES.ERROR);
      throw err;
    }
  }, [showError]);

  // Update an existing expense
  const updateExpense = useCallback(async (id, expenseData) => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const now = new Date();
    const updatedExpense = {
      ...expenseData,
      updatedAt: now.toISOString()
    };

    try {
      const expenseRef = doc(db, 'expenses', id);
      await updateDoc(expenseRef, updatedExpense);
      
      // Update local state
      setExpenses(prev => 
        prev.map(expense => 
          expense.id === id 
            ? { ...expense, ...updatedExpense } 
            : expense
        )
      );
    } catch (err) {
      console.error('Error updating expense:', err);
      showError('Failed to update expense', ERROR_TYPES.ERROR);
      throw err;
    }
  }, [showError]);

  // Delete an expense
  const deleteExpense = useCallback(async (id) => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const expenseRef = doc(db, 'expenses', id);
      await deleteDoc(expenseRef);
      
      // Update local state
      setExpenses(prev => prev.filter(expense => expense.id !== id));
    } catch (err) {
      console.error('Error deleting expense:', err);
      showError('Failed to delete expense', ERROR_TYPES.ERROR);
      throw err;
    }
  }, [showError]);

  // Fetch expenses on mount and when auth changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        fetchExpenses();
      } else {
        setExpenses([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [fetchExpenses]);

  return (
    <ExpenseContext.Provider
      value={{
        expenses,
        loading,
        error,
        addExpense,
        updateExpense,
        deleteExpense,
        fetchExpenses,
        refreshExpenses,
      }}
    >
      {children}
    </ExpenseContext.Provider>
  );
};

// Custom hook for using the expense context
export const useExpenses = () => {
  const context = useContext(ExpenseContext);
  if (!context) {
    throw new Error('useExpenses must be used within an ExpenseProvider');
  }
  return context;
};