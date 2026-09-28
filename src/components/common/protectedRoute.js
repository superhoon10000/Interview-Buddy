import React from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { PAGES } from "../../utils/constants";

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    console.log("Protectedroute:", { user,loading });

    if(loading) {
        return <div>Loading...</div>;
    }
    if(!user) {
        return <Navigate to={PAGES.LOGIN} replace />;
    }
    return children;
}

export default ProtectedRoute;