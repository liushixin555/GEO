import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface SelectionItem {
  id: number;
  short_name: string;
}

interface AppContextType {
  companyId: number | null;
  companyName: string;
  projectId: number | null;
  projectName: string;
  setContext: (company: SelectionItem | null, project: SelectionItem | null) => void;
}

const AppContext = createContext<AppContextType>({
  companyId: null,
  companyName: '',
  projectId: null,
  projectName: '',
  setContext: () => {},
});

export const useAppContext = () => useContext(AppContext);

const COMPANY_KEY = 'selected_company';
const PROJECT_KEY = 'selected_project';

function loadSelection(): { company: SelectionItem | null; project: SelectionItem | null } {
  try {
    const c = localStorage.getItem(COMPANY_KEY);
    const p = localStorage.getItem(PROJECT_KEY);
    return {
      company: c ? JSON.parse(c) : null,
      project: p ? JSON.parse(p) : null,
    };
  } catch {
    return { company: null, project: null };
  }
}

function persistSelection(company: SelectionItem | null, project: SelectionItem | null) {
  if (company) {
    localStorage.setItem(COMPANY_KEY, JSON.stringify(company));
  } else {
    localStorage.removeItem(COMPANY_KEY);
  }
  if (project) {
    localStorage.setItem(PROJECT_KEY, JSON.stringify(project));
  } else {
    localStorage.removeItem(PROJECT_KEY);
  }
}

export const AppContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [company, setCompany] = useState<SelectionItem | null>(null);
  const [project, setProject] = useState<SelectionItem | null>(null);

  // Initialize from localStorage on mount
  useEffect(() => {
    const { company: savedCompany, project: savedProject } = loadSelection();
    if (savedCompany) setCompany(savedCompany);
    if (savedProject) setProject(savedProject);
  }, []);

  const setContext = useCallback((newCompany: SelectionItem | null, newProject: SelectionItem | null) => {
    setCompany(newCompany);
    setProject(newProject);
    persistSelection(newCompany, newProject);
  }, []);

  return (
    <AppContext.Provider
      value={{
        companyId: company?.id ?? null,
        companyName: company?.short_name ?? '',
        projectId: project?.id ?? null,
        projectName: project?.short_name ?? '',
        setContext,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;
