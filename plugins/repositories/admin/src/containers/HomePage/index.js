import React, { memo, useEffect, useState } from "react";
import { Header } from "@buffetjs/custom";
import { Table } from "@buffetjs/core";
import styled from "styled-components";
import axios from "axios";

const Wrapper = styled.div`
  padding: 18px 30px;

  p {
    margin-top: 1rem;
  }
`;

const headers = [
  {
    name: "Name",
    value: "name",
  },
  {
    name: "Description",
    value: "description",
  },
  {
    name: "Url",
    value: "html_url",
  },
];

const HomePage = () => {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    axios
      .get("https://api.github.com/users/gustavomanca/repos")
      .then(({ data }) => setRows(data))
      .catch((error) =>
        strapi.notification.error(`Oops... GitHub API limit exceeded, ${error}`)
      );
  });

  return (
    <Wrapper>
      <Header
        title={{ label: "Repositories" }}
        content="A list of my public GitHub repositories"
      />

      <Table headers={headers} rows={rows} />
    </Wrapper>
  );
};

export default memo(HomePage);
