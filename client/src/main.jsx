import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import ErrorBoundary from './components/ErrorBoundary.jsx'

import { ApolloProvider } from '@apollo/client';
import { client } from './graph/apolloClient';

createRoot(document.getElementById('root')).render(
    <StrictMode>
        {/*<ErrorBoundary>*/}
            <ApolloProvider client={client}>
                <App />
            </ApolloProvider>
        {/*</ErrorBoundary>*/}
    </StrictMode>,
)
