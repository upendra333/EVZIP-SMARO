export function SupabaseError() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 border-2 border-red-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-red-600 text-xl">⚠️</span>
          </div>
          <h1 className="text-xl font-bold text-red-600">Supabase Not Configured</h1>
        </div>
        
        <p className="text-gray-700 mb-4">
          Please configure your Supabase environment variables to use this application.
        </p>
        
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Steps to fix:</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
            <li>Create a <code className="bg-gray-200 px-1 rounded">.env</code> file in the project root</li>
            <li>Add your Supabase credentials:</li>
          </ol>
          <pre className="mt-2 text-xs bg-gray-200 p-2 rounded overflow-x-auto">
{`VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key`}
          </pre>
        </div>
        
        <p className="text-sm text-gray-600">
          After adding the environment variables, restart the development server.
        </p>
      </div>
    </div>
  )
}

