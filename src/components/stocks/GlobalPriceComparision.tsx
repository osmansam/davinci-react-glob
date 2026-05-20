import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { PriceComparePriceEntry } from "../../utils/api/priceCompare";
import { useGetGlobalPriceCompareHashmap } from "../../utils/api/priceCompare";
import GenericTable from "../panelComponents/Tables/GenericTable";

type PriceCompareRow = Record<string, unknown> & {
  key: string;
  name: string;
  bestSite: string;
  minPrice: number;
  maxPrice: number;
  priceGap: number;
  availableSiteCount: number;
  outOfStockSites: Record<string, boolean>;
};

const PRICE_DECIMALS = 2;

const toLabelFromKey = (siteKey: string) => {
  if (!siteKey) return "-";
  return siteKey.charAt(0).toUpperCase() + siteKey.slice(1);
};

const getPriceDetails = (entry: PriceComparePriceEntry | undefined) => {
  if (typeof entry === "number") {
    return {
      price: entry,
      isOutOfStock: false,
    };
  }

  if (entry && typeof entry.price === "number") {
    return {
      price: entry.price,
      isOutOfStock: entry.remainingStock <= 0,
    };
  }

  return null;
};

const GlobalPriceComparision = () => {
  const { t } = useTranslation();
  const response = useGetGlobalPriceCompareHashmap();

  const siteEntries = useMemo(() => {
    const sitesMap = response?.sites ?? {};
    const siteOrder = Object.keys(sitesMap);

    const keysFromHashmap = new Set<string>();
    Object.values(response?.hashmap ?? {}).forEach((item) => {
      Object.keys(item.prices ?? {}).forEach((priceSiteKey) => {
        keysFromHashmap.add(priceSiteKey);
      });
    });

    const mergedKeys = [
      ...siteOrder,
      ...Array.from(keysFromHashmap).filter((key) => !siteOrder.includes(key)),
    ];

    return mergedKeys.map(
      (siteKey) =>
        [siteKey, sitesMap[siteKey] ?? toLabelFromKey(siteKey)] as const,
    );
  }, [response?.sites, response?.hashmap]);

  const rows = useMemo<PriceCompareRow[]>(() => {
    const hashmap = response?.hashmap ?? {};

    return Object.entries(hashmap).map(([itemKey, item]) => {
      let minPrice = Number.POSITIVE_INFINITY;
      let maxPrice = 0;
      let bestSite = "-";
      let availableSiteCount = 0;

      const sitePriceMap: Record<string, string | number> = {};
      const outOfStockSites: Record<string, boolean> = {};

      siteEntries.forEach(([siteKey, siteLabel]) => {
        const rawPrice = item.prices[siteKey];
        const priceDetails = getPriceDetails(rawPrice);
        if (priceDetails) {
          const normalizedPrice = Number(
            priceDetails.price.toFixed(PRICE_DECIMALS),
          );
          sitePriceMap[siteKey] = normalizedPrice;
          outOfStockSites[siteKey] = priceDetails.isOutOfStock;
          availableSiteCount += 1;

          if (normalizedPrice < minPrice) {
            minPrice = normalizedPrice;
            bestSite = siteLabel;
          }

          if (normalizedPrice > maxPrice) {
            maxPrice = normalizedPrice;
          }
        } else {
          sitePriceMap[siteKey] = "-";
          outOfStockSites[siteKey] = false;
        }
      });

      const hasAnyPrice = availableSiteCount > 0;

      return {
        key: itemKey,
        name: item.name,
        ...sitePriceMap,
        outOfStockSites,
        bestSite,
        minPrice: hasAnyPrice ? Number(minPrice.toFixed(PRICE_DECIMALS)) : 0,
        maxPrice: hasAnyPrice ? Number(maxPrice.toFixed(PRICE_DECIMALS)) : 0,
        priceGap: hasAnyPrice
          ? Number((maxPrice - minPrice).toFixed(PRICE_DECIMALS))
          : 0,
        availableSiteCount,
      };
    });
  }, [response?.hashmap, siteEntries]);

  const columns = useMemo(() => {
    return [
      { key: t("Product"), isSortable: true },
      ...siteEntries.map(([, siteLabel]) => ({
        key: siteLabel,
        isSortable: true,
      })),
      { key: t("Best Site"), isSortable: true },
      { key: t("Min Price"), isSortable: true },
      { key: t("Max Price"), isSortable: true },
      { key: t("Price Gap"), isSortable: true },
      { key: t("Available Sites"), isSortable: true },
    ];
  }, [siteEntries, t]);

  const rowKeys = useMemo(() => {
    return [
      { key: "name" },
      ...siteEntries.map(([siteKey]) => ({
        key: siteKey,
        node: (row: PriceCompareRow) => {
          const value = row[siteKey];
          const isOutOfStock = row.outOfStockSites[siteKey];

          if (value === undefined || value === null || value === "") {
            return "-";
          }

          return (
            <span
              className={
                isOutOfStock
                  ? "inline-flex w-fit rounded-md bg-red-600 px-2 py-1 font-semibold text-white"
                  : ""
              }
            >
              {String(value)}
            </span>
          );
        },
      })),
      { key: "bestSite" },
      { key: "minPrice" },
      { key: "maxPrice" },
      { key: "priceGap" },
      { key: "availableSiteCount" },
    ];
  }, [siteEntries]);

  const searchRowKeys = useMemo(
    () => [{ key: "key" }, { key: "name" }, { key: "bestSite" }],
    [],
  );

  const tableTitle = t("Global Price Comparision");

  return (
    <div className="w-[95%] mx-auto">
      <div className="text-sm text-gray-600 mb-2" />
      <GenericTable
        rowKeys={rowKeys}
        searchRowKeys={searchRowKeys}
        columns={columns}
        rows={rows}
        title={tableTitle}
        isActionsActive={false}
      />
    </div>
  );
};

export default GlobalPriceComparision;
