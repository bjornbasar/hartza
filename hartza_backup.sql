--
-- PostgreSQL database dump
--

\restrict LO1WqLd7phrOXQra1xKgVfKiSgXWyAYKvSe3jAsraFWbb3de4pBWD5sJQMznR9W

-- Dumped from database version 16.11
-- Dumped by pg_dump version 16.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: Frequency; Type: TYPE; Schema: public; Owner: hartza
--

CREATE TYPE public."Frequency" AS ENUM (
    'ONE_OFF',
    'WEEKLY',
    'FORTNIGHTLY',
    'MONTHLY'
);


ALTER TYPE public."Frequency" OWNER TO hartza;

--
-- Name: Role; Type: TYPE; Schema: public; Owner: hartza
--

CREATE TYPE public."Role" AS ENUM (
    'OWNER',
    'MEMBER'
);


ALTER TYPE public."Role" OWNER TO hartza;

--
-- Name: TransactionType; Type: TYPE; Schema: public; Owner: hartza
--

CREATE TYPE public."TransactionType" AS ENUM (
    'EXPENSE',
    'INCOME'
);


ALTER TYPE public."TransactionType" OWNER TO hartza;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: BudgetItem; Type: TABLE; Schema: public; Owner: hartza
--

CREATE TABLE public."BudgetItem" (
    id text NOT NULL,
    name text NOT NULL,
    category text,
    amount double precision NOT NULL,
    frequency public."Frequency" NOT NULL,
    "startDate" date NOT NULL,
    "endDate" date,
    notes text,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "householdId" text NOT NULL
);


ALTER TABLE public."BudgetItem" OWNER TO hartza;

--
-- Name: Config; Type: TABLE; Schema: public; Owner: hartza
--

CREATE TABLE public."Config" (
    id text NOT NULL,
    "startingBalance" double precision DEFAULT 0 NOT NULL,
    "balanceDate" date,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "householdId" text NOT NULL
);


ALTER TABLE public."Config" OWNER TO hartza;

--
-- Name: Household; Type: TABLE; Schema: public; Owner: hartza
--

CREATE TABLE public."Household" (
    id text NOT NULL,
    name text NOT NULL,
    "joinCode" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Household" OWNER TO hartza;

--
-- Name: Income; Type: TABLE; Schema: public; Owner: hartza
--

CREATE TABLE public."Income" (
    id text NOT NULL,
    name text NOT NULL,
    amount double precision NOT NULL,
    frequency public."Frequency" NOT NULL,
    "startDate" date NOT NULL,
    "endDate" date,
    notes text,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "householdId" text NOT NULL
);


ALTER TABLE public."Income" OWNER TO hartza;

--
-- Name: Transaction; Type: TABLE; Schema: public; Owner: hartza
--

CREATE TABLE public."Transaction" (
    id text NOT NULL,
    amount double precision NOT NULL,
    date date NOT NULL,
    description text,
    "budgetItemId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "incomeId" text,
    type public."TransactionType" DEFAULT 'EXPENSE'::public."TransactionType" NOT NULL,
    "householdId" text NOT NULL
);


ALTER TABLE public."Transaction" OWNER TO hartza;

--
-- Name: User; Type: TABLE; Schema: public; Owner: hartza
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    "passwordHash" text NOT NULL,
    role public."Role" DEFAULT 'MEMBER'::public."Role" NOT NULL,
    "householdId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."User" OWNER TO hartza;

--
-- Data for Name: BudgetItem; Type: TABLE DATA; Schema: public; Owner: hartza
--

COPY public."BudgetItem" (id, name, category, amount, frequency, "startDate", "endDate", notes, active, "createdAt", "updatedAt", "householdId") FROM stdin;
cmm9r93ly0004r87c58pb2jah	Groceries	Food	200	WEEKLY	2026-03-09	2026-04-30	\N	t	2026-03-02 22:33:11.301	2026-03-03 06:32:08.601	cmma7zk700000pelf2vmoi6x1
cmm9r9yoh0005r87cvfqx054x	Mobile	Utilities	290	MONTHLY	2026-04-03	\N	\N	t	2026-03-02 22:33:51.569	2026-03-03 06:33:03.836	cmma7zk700000pelf2vmoi6x1
cmm9rdfof0009r87clem1cn7b	Health Bjorn	Insurance	18.95	FORTNIGHTLY	2026-03-12	\N	\N	t	2026-03-02 22:36:33.567	2026-03-03 08:15:19.266	cmma7zk700000pelf2vmoi6x1
cmm9rdu9q000ar87c4ysx2ag7	Health Diana	Insurance	21.27	FORTNIGHTLY	2026-03-06	\N	\N	t	2026-03-02 22:36:52.479	2026-03-03 08:15:35.193	cmma7zk700000pelf2vmoi6x1
cmm9rlpfh000hr87cm49lgy21	Afterpay	Cards	63.41	FORTNIGHTLY	2026-03-13	2026-03-27	\N	t	2026-03-02 22:42:59.453	2026-03-03 06:21:39.72	cmma7zk700000pelf2vmoi6x1
cmm9rml3k000ir87cp3z5m5sh	Afterpay	Cards	131.12	FORTNIGHTLY	2026-03-13	2026-04-10	\N	t	2026-03-02 22:43:40.496	2026-03-03 06:21:39.72	cmma7zk700000pelf2vmoi6x1
cmma5yz5w0001unxk6cx5domt	Afterpay	Cards	107.52	ONE_OFF	2026-03-20	2026-03-20	\N	t	2026-03-03 05:25:13.219	2026-03-03 06:21:39.72	cmma7zk700000pelf2vmoi6x1
cmm9rpbaj000lr87cznf0hw64	Gem	Cards	80	MONTHLY	2026-03-30	\N	\N	t	2026-03-02 22:45:47.754	2026-03-03 06:21:39.72	cmma7zk700000pelf2vmoi6x1
cmm9rpqox000mr87c49oqxuir	Q Mastercard	Cards	350	MONTHLY	2026-03-31	\N	\N	t	2026-03-02 22:46:07.712	2026-03-03 06:21:39.72	cmma7zk700000pelf2vmoi6x1
cmm9rqcgw000nr87cj5y68965	Netflix	Entertainment	18	MONTHLY	2026-04-01	\N	\N	t	2026-03-02 22:46:35.935	2026-03-03 06:21:39.72	cmma7zk700000pelf2vmoi6x1
cmm9rqplz000or87ctot7lu9l	Spotify Family	Entertainment	26	MONTHLY	2026-04-01	\N	\N	t	2026-03-02 22:46:52.967	2026-03-03 06:21:39.72	cmma7zk700000pelf2vmoi6x1
cmm9rjz7o000fr87cphv17nty	Afterpay	Cards	117.47	FORTNIGHTLY	2026-03-20	2026-04-03	\N	t	2026-03-02 22:41:38.82	2026-03-03 06:21:39.72	cmma7zk700000pelf2vmoi6x1
cmm9s7zlb0018r87cmwi0k6p7	Petrol	Travel	100	WEEKLY	2026-03-09	\N	\N	t	2026-03-02 23:00:19.026	2026-03-03 06:21:39.72	cmma7zk700000pelf2vmoi6x1
cmm9rffv8000cr87cj7i78hqo	Gym	Entertainment	87.8	FORTNIGHTLY	2026-03-13	\N	\N	t	2026-03-02 22:38:07.124	2026-03-03 06:21:39.72	cmma7zk700000pelf2vmoi6x1
cmm9rarvj0006r87cu8gwjolo	Mercury	Utilities	350	MONTHLY	2026-03-27	\N	\N	t	2026-03-02 22:34:29.386	2026-03-03 06:21:39.72	cmma7zk700000pelf2vmoi6x1
cmma61z7j0002unxk6bff7kt1	Groceries	Food	400	WEEKLY	2026-05-04	\N	\N	t	2026-03-03 05:27:33.247	2026-03-03 06:21:39.72	cmma7zk700000pelf2vmoi6x1
cmma6ieqk0005unxk5p9gxp4n	St.John Church donation	School	24	WEEKLY	2026-03-06	\N	\N	t	2026-03-03 05:40:19.868	2026-03-03 06:21:39.72	cmma7zk700000pelf2vmoi6x1
cmma65ilm0003unxkszgsglvq	Maria	Loan	500	ONE_OFF	2026-04-30	\N	\N	t	2026-03-03 05:30:18.346	2026-03-03 06:21:39.72	cmma7zk700000pelf2vmoi6x1
cmma6gzlw0004unxkixriapq0	Uniform	School	103.75	FORTNIGHTLY	2026-03-27	\N	\N	t	2026-03-03 05:39:13.579	2026-03-03 06:21:39.72	cmma7zk700000pelf2vmoi6x1
cmm9rbejz0007r87ck79lsp67	Remittance	Family	1000	MONTHLY	2026-04-01	2026-05-01	\N	t	2026-03-02 22:34:58.799	2026-03-03 06:21:39.72	cmma7zk700000pelf2vmoi6x1
cmm9ro4q8000jr87c0gfp0des	Personal Loan	Loan	115.99	MONTHLY	2026-04-02	\N	\N	t	2026-03-02 22:44:52.569	2026-03-03 06:21:39.72	cmma7zk700000pelf2vmoi6x1
cmm9r8e8z0003r87chvcrkjtm	Rent	Rent	700	WEEKLY	2026-03-07	\N	\N	t	2026-03-02 22:32:38.435	2026-03-03 06:21:39.72	cmma7zk700000pelf2vmoi6x1
cmm9rcj350008r87c86ybo443	Life Insurance	Insurance	215	FORTNIGHTLY	2026-03-13	\N	\N	t	2026-03-02 22:35:51.329	2026-03-03 06:21:39.72	cmma7zk700000pelf2vmoi6x1
cmm9recg3000br87cjvm45uax	Car Insurance	Insurance	64.93	FORTNIGHTLY	2026-03-17	\N	\N	t	2026-03-02 22:37:16.035	2026-03-03 06:21:39.72	cmma7zk700000pelf2vmoi6x1
cmm9rorxd000kr87cxqhjk5u2	Car Loan	Loan	277.06	FORTNIGHTLY	2026-03-13	\N	\N	t	2026-03-02 22:45:22.657	2026-03-03 06:21:39.72	cmma7zk700000pelf2vmoi6x1
cmma5x0rm0000unxk3pvzfvpg	Afterpay	Cards	132.69	ONE_OFF	2026-03-13	2026-03-13	\N	t	2026-03-03 05:23:41.986	2026-03-03 06:21:39.72	cmma7zk700000pelf2vmoi6x1
cmma8cp5s0003bo9bphcgg6yp	Groceries	Food	150	WEEKLY	2026-03-02	2026-03-08	\N	t	2026-03-03 06:31:52.672	2026-03-03 06:31:52.672	cmma7zk700000pelf2vmoi6x1
cmmahfhg90001ha94n4h5ws59	Afterpay	Cards	91.68	FORTNIGHTLY	2026-03-20	2026-04-17	\N	t	2026-03-03 10:45:59.189	2026-03-03 10:45:59.189	cmma7zk700000pelf2vmoi6x1
\.


--
-- Data for Name: Config; Type: TABLE DATA; Schema: public; Owner: hartza
--

COPY public."Config" (id, "startingBalance", "balanceDate", "createdAt", "updatedAt", "householdId") FROM stdin;
singleton	1429.5	2026-03-03	2026-03-03 05:18:50.193	2026-03-03 06:21:39.72	cmma7zk700000pelf2vmoi6x1
\.


--
-- Data for Name: Household; Type: TABLE DATA; Schema: public; Owner: hartza
--

COPY public."Household" (id, name, "joinCode", "createdAt", "updatedAt") FROM stdin;
cmma7zk700000pelf2vmoi6x1	Basar Household	W5ZFYKWG	2026-03-03 06:21:39.709	2026-03-03 06:21:39.709
\.


--
-- Data for Name: Income; Type: TABLE DATA; Schema: public; Owner: hartza
--

COPY public."Income" (id, name, amount, frequency, "startDate", "endDate", notes, active, "createdAt", "updatedAt", "householdId") FROM stdin;
cmm9r63op0002r87c6lya7204	Diana	5559.04	MONTHLY	2026-04-30	\N	\N	t	2026-03-02 22:30:51.433	2026-03-03 06:21:39.72	cmma7zk700000pelf2vmoi6x1
cmm9r5gqo0001r87ce3nh8s67	Diana - adjusted	2779.52	MONTHLY	2026-03-31	2026-03-31	\N	t	2026-03-02 22:30:21.696	2026-03-03 06:21:39.72	cmma7zk700000pelf2vmoi6x1
cmm9r4ma20000r87chb0k0jxn	Bjorn	2807.16	FORTNIGHTLY	2026-03-12	\N	\N	t	2026-03-02 22:29:42.218	2026-03-03 06:21:39.72	cmma7zk700000pelf2vmoi6x1
cmma6u0c50006unxkpch7n0lj	Richard	315	ONE_OFF	2026-03-07	\N	\N	t	2026-03-03 05:49:21.078	2026-03-03 06:21:39.72	cmma7zk700000pelf2vmoi6x1
\.


--
-- Data for Name: Transaction; Type: TABLE DATA; Schema: public; Owner: hartza
--

COPY public."Transaction" (id, amount, date, description, "budgetItemId", "createdAt", "updatedAt", "incomeId", type, "householdId") FROM stdin;
cmmaas2010001ablyyv10vntu	46.9	2026-03-03	Rice	cmma8cp5s0003bo9bphcgg6yp	2026-03-03 07:39:48.381	2026-03-03 07:39:48.381	\N	EXPENSE	cmma7zk700000pelf2vmoi6x1
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: hartza
--

COPY public."User" (id, email, name, "passwordHash", role, "householdId", "createdAt", "updatedAt") FROM stdin;
cmma873da0001bo9bmo6rcs8s	bjorn@minified.work	Bjorn Basar	$2a$12$2AiyKFipt57k9hx90v6Zq.DIXptig3LssswaxACmCqqsQMPiIeRf2	OWNER	cmma7zk700000pelf2vmoi6x1	2026-03-03 06:27:31.15	2026-03-03 06:27:31.15
cmmabcdj30003ablyp4sa95ed	diana.basar.23@gmail.com	Diana Basar	$2a$12$p2e7nuE8bodoRGbD/zTP2uqj4iSqvrcvxoiLMBPSABTN2MIsXqCBu	MEMBER	cmma7zk700000pelf2vmoi6x1	2026-03-03 07:55:36.447	2026-03-03 07:55:36.447
\.


--
-- Name: BudgetItem BudgetItem_pkey; Type: CONSTRAINT; Schema: public; Owner: hartza
--

ALTER TABLE ONLY public."BudgetItem"
    ADD CONSTRAINT "BudgetItem_pkey" PRIMARY KEY (id);


--
-- Name: Config Config_pkey; Type: CONSTRAINT; Schema: public; Owner: hartza
--

ALTER TABLE ONLY public."Config"
    ADD CONSTRAINT "Config_pkey" PRIMARY KEY (id);


--
-- Name: Household Household_pkey; Type: CONSTRAINT; Schema: public; Owner: hartza
--

ALTER TABLE ONLY public."Household"
    ADD CONSTRAINT "Household_pkey" PRIMARY KEY (id);


--
-- Name: Income Income_pkey; Type: CONSTRAINT; Schema: public; Owner: hartza
--

ALTER TABLE ONLY public."Income"
    ADD CONSTRAINT "Income_pkey" PRIMARY KEY (id);


--
-- Name: Transaction Transaction_pkey; Type: CONSTRAINT; Schema: public; Owner: hartza
--

ALTER TABLE ONLY public."Transaction"
    ADD CONSTRAINT "Transaction_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: hartza
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: Config_householdId_key; Type: INDEX; Schema: public; Owner: hartza
--

CREATE UNIQUE INDEX "Config_householdId_key" ON public."Config" USING btree ("householdId");


--
-- Name: Household_joinCode_key; Type: INDEX; Schema: public; Owner: hartza
--

CREATE UNIQUE INDEX "Household_joinCode_key" ON public."Household" USING btree ("joinCode");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: hartza
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: BudgetItem BudgetItem_householdId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hartza
--

ALTER TABLE ONLY public."BudgetItem"
    ADD CONSTRAINT "BudgetItem_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES public."Household"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Config Config_householdId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hartza
--

ALTER TABLE ONLY public."Config"
    ADD CONSTRAINT "Config_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES public."Household"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Income Income_householdId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hartza
--

ALTER TABLE ONLY public."Income"
    ADD CONSTRAINT "Income_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES public."Household"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Transaction Transaction_budgetItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hartza
--

ALTER TABLE ONLY public."Transaction"
    ADD CONSTRAINT "Transaction_budgetItemId_fkey" FOREIGN KEY ("budgetItemId") REFERENCES public."BudgetItem"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Transaction Transaction_householdId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hartza
--

ALTER TABLE ONLY public."Transaction"
    ADD CONSTRAINT "Transaction_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES public."Household"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Transaction Transaction_incomeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hartza
--

ALTER TABLE ONLY public."Transaction"
    ADD CONSTRAINT "Transaction_incomeId_fkey" FOREIGN KEY ("incomeId") REFERENCES public."Income"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: User User_householdId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hartza
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES public."Household"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict LO1WqLd7phrOXQra1xKgVfKiSgXWyAYKvSe3jAsraFWbb3de4pBWD5sJQMznR9W

