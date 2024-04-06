import React from "react";
import { useQuery, gql } from "@apollo/client";

const GET_ITEMS = gql`
  query GetItems {
    items
  }
`;

const Home = () => {
  const { loading, error, data } = useQuery(GET_ITEMS);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error :(</p>;

  return data.items.map((item: string) => <div key={item}>{item}</div>);
};

export default Home;
