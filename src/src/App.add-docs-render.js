// import at top of file
import DocumentsPage from "./DocumentsPage";

// ... inside main-content switch
{active === "documents" && <DocumentsPage user={user} showToast={showToast} supabase={supabase} />}