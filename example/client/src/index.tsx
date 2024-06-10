import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import Home from "./pages/home";
import LazyQuery from "./pages/lazyQuery";
import { ApolloClient, InMemoryCache, ApolloProvider } from "@apollo/client";

const client = new ApolloClient({
  uri: "http://localhost:4000/api/graphql",
  cache: new InMemoryCache(),
});

const App = () => {
  const [names, setNames] = useState([]);

  useEffect(() => {
    fetch('http://localhost:4000/api/getNames')
      .then(response => response.json())
      .then(data => setNames(data));
  }, []);

  return (
    <div>
      <h2>Test GraphQL</h2>
      <Home />
      <hr />
      <h2>Test GraphQL Lazy Query</h2>
      <LazyQuery />
      <hr />
      <h2>Test RESTful</h2>
      {names.map((name, index) => <div key={index}>{name}</div>)}
    </div>
  );
};

ReactDOM.render(
  <ApolloProvider client={client}>
    <App />
  </ApolloProvider>,
  document.getElementById("root")
);