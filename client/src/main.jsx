import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import ErrorBoundary from './components/Errors/ErrorBoundary.jsx'

import { ApolloProvider } from '@apollo/client';
import { client } from './graph/apolloClient';
import { DataProvider } from './components/Providers/DataProvider';

createRoot(document.getElementById('root')).render(
    <StrictMode>
        {/*<ErrorBoundary>*/}
            <ApolloProvider client={client}>
                <DataProvider>
                    <App />
                </DataProvider>
            </ApolloProvider>
        {/*</ErrorBoundary>*/}
    </StrictMode>,
)
