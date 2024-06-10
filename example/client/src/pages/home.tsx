import React from "react";
import { useQuery, gql } from "@apollo/client";

const GET_ITEMS = gql`
  query GetItems {
    items
  }
`;

const GET_TYPES = gql`
  query GetTypes {
    getTypes
  }
`;

const Home = () => {
  console.log("sending request-----------");
  const { loading: loadingItems, error: errorItems, data: dataItems } = useQuery(GET_ITEMS, {
    fetchPolicy: "network-only",
  });
  const { loading: loadingTypes, error: errorTypes, data: dataTypes } = useQuery(GET_TYPES, {
    fetchPolicy: "network-only",
  });
  console.log("sending request end-------------");

  if (loadingItems || loadingTypes) return <p>Loading...</p>;
  if (errorItems || errorTypes) return <p>Error :(</p>;

  return (
    <>
      {dataItems && dataItems.items.map((item: string) => <div key={item}>{item}</div>)}
      <div>------------</div>
      {dataTypes && dataTypes.getTypes.map((type: string) => <div key={type}>{type}</div>)}
    </>
  );
};

export default Home;