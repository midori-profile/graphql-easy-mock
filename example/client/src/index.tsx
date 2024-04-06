import React from "react";
import ReactDOM from "react-dom";
import Home from "./pages/home";
import { ApolloClient, InMemoryCache, ApolloProvider } from "@apollo/client";

const client = new ApolloClient({
  uri: "http://localhost:4000/api/graphql",
  cache: new InMemoryCache(),
});

const App = () => (
  <div>
    Hello, React with graphql!
    <Home />
  </div>
);

ReactDOM.render(
  <ApolloProvider client={client}>
    <App />
  </ApolloProvider>,
  document.getElementById("root")
);
