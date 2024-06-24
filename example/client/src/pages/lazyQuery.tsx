import React from 'react';
import { useLazyQuery, gql } from '@apollo/client';

const GET_ITEMS = gql`
  query GetItems {
    items
  }
`;

const LazyQuery = () => {
  const [getItems, { loading: loadingItems, data: dataItems }] = useLazyQuery(GET_ITEMS);

  if (loadingItems) return <p>Loading...</p>;

  return (
    <div>
      <button onClick={() => getItems()}>Load Items</button>
      <div>
        {dataItems && dataItems.items.map((item: string) => <div key={item}>{item}</div>)}
      </div>
    </div>
  );
};

export default LazyQuery;