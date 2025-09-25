import React, { createContext, useContext, useState, useEffect } from 'react';

const AdminContext = createContext();

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};

export const AdminProvider = ({ children }) => {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminData, setAdminData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for stored admin token on mount
  useEffect(() => {
    checkAdminToken();
  }, []);

  const checkAdminToken = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setIsLoading(false);
        return;
      }

      // Verify token with backend
      const response = await fetch('http://localhost:5000/api/admin/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        setIsAdminAuthenticated(true);
        setAdminData(result.data);
      } else {
        // Token is invalid, remove it
        localStorage.removeItem('adminToken');
        setIsAdminAuthenticated(false);
        setAdminData(null);
      }
    } catch (error) {
      console.error('Error checking admin token:', error);
      localStorage.removeItem('adminToken');
      setIsAdminAuthenticated(false);
      setAdminData(null);
    }
    setIsLoading(false);
  };

  const adminLogin = async (email, password) => {
    try {
      const response = await fetch('http://localhost:5000/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (result.success) {
        localStorage.setItem('adminToken', result.data.token);
        setIsAdminAuthenticated(true);
        setAdminData(result.data.admin);
        return { success: true, data: result.data };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Admin login error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const adminLogout = () => {
    localStorage.removeItem('adminToken');
    setIsAdminAuthenticated(false);
    setAdminData(null);
  };

  const value = {
    isAdminAuthenticated,
    adminData,
    isLoading,
    adminLogin,
    adminLogout,
    checkAdminToken
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};

export default AdminContext;
