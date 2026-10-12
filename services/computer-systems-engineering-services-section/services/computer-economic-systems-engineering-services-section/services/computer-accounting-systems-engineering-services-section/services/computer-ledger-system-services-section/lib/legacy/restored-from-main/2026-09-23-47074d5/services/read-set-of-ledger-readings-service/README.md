# @red-cup-engineering/read-set-of-ledger-readings-service

Reads the standard set of ledger reports a books page needs in one call — balance sheet,
income statement, the reconcile worklist, journal statistics, and the account list — by
composing `readLedgerReport` once per reading against the same journal. Contains no report
logic of its own.

## Operation

~~~js
export async function readSetOfLedgerReadings(input)
~~~

### Parameters

- input ({ journal: ({ path: string } | { text: string, format?: ("beancount"|"hledger") }),
 *   begin?: string, end?: string, account?: string, depth?: number, status?: string,
 *   payee?: string, requireMeta?: string, now?: string }): 

### Returns

Promise<{ kind: "ledger-readings", readings: { balanceSheet: object,
 *   incomeStatement: object, reconcile: object, stats: object, accounts: object } }>: 

### Refusals

- TypeError: When `input.journal` names neither `path` nor `text`.

## Command

read-set-of-ledger-readings reads one JSON value per input line and writes one JSON value per output line.

## Examples

### reads the standard set of readings from inline text with a pinned generatedAt

Input:

~~~json
{
  "journal": {
    "text": "option \"title\" \"Test Ledger\"\noption \"operating_currency\" \"USD\"\n\n2026-01-01 open Assets:Cash:Operating USD\n2026-01-01 open Assets:Cash:Reserve USD\n2026-01-01 open Equity:Opening-Balances\n2026-01-01 open Income:Consulting\n2026-01-01 open Expenses:Software\n\n2026-01-01 * \"Opening balance\"\n  Assets:Cash:Operating  1000.00 USD\n  Equity:Opening-Balances  -1000.00 USD\n\n2026-01-05 * \"Client payment\" \"Acme Corp\"\n  Assets:Cash:Operating  500.00 USD\n  Income:Consulting  -500.00 USD\n\n2026-01-10 * \"Software subscription\"\n  Assets:Cash:Operating  -20.00 USD\n  Expenses:Software  20.00 USD\n\n2026-01-15 balance Assets:Cash:Operating  1480.00 USD\n\n2026-01-20 balance Assets:Cash:Reserve  50.00 USD\n"
  },
  "now": "2026-09-05T00:00:00.000Z"
}
~~~

Output:

~~~json
{
  "kind": "ledger-readings",
  "readings": {
    "balanceSheet": {
      "tree": {
        "name": "",
        "segment": "",
        "depth": -1,
        "own": {},
        "total": {
          "USD": {
            "kind": "exactNumber.gradedRational",
            "value": {
              "kind": "exactNumber.rational",
              "num": "0",
              "den": "1"
            },
            "grade": "USD"
          }
        },
        "children": {
          "Assets": {
            "name": "Assets",
            "segment": "Assets",
            "depth": 0,
            "own": {},
            "total": {
              "USD": {
                "kind": "exactNumber.gradedRational",
                "value": {
                  "kind": "exactNumber.rational",
                  "num": "1480",
                  "den": "1"
                },
                "grade": "USD"
              }
            },
            "children": {
              "Cash": {
                "name": "Assets:Cash",
                "segment": "Cash",
                "depth": 1,
                "own": {},
                "total": {
                  "USD": {
                    "kind": "exactNumber.gradedRational",
                    "value": {
                      "kind": "exactNumber.rational",
                      "num": "1480",
                      "den": "1"
                    },
                    "grade": "USD"
                  }
                },
                "children": {
                  "Operating": {
                    "name": "Assets:Cash:Operating",
                    "segment": "Operating",
                    "depth": 2,
                    "own": {
                      "USD": {
                        "kind": "exactNumber.gradedRational",
                        "value": {
                          "kind": "exactNumber.rational",
                          "num": "1480",
                          "den": "1"
                        },
                        "grade": "USD"
                      }
                    },
                    "total": {
                      "USD": {
                        "kind": "exactNumber.gradedRational",
                        "value": {
                          "kind": "exactNumber.rational",
                          "num": "1480",
                          "den": "1"
                        },
                        "grade": "USD"
                      }
                    },
                    "children": {}
                  }
                }
              }
            }
          },
          "Equity": {
            "name": "Equity",
            "segment": "Equity",
            "depth": 0,
            "own": {},
            "total": {
              "USD": {
                "kind": "exactNumber.gradedRational",
                "value": {
                  "kind": "exactNumber.rational",
                  "num": "-1000",
                  "den": "1"
                },
                "grade": "USD"
              }
            },
            "children": {
              "Opening-Balances": {
                "name": "Equity:Opening-Balances",
                "segment": "Opening-Balances",
                "depth": 1,
                "own": {
                  "USD": {
                    "kind": "exactNumber.gradedRational",
                    "value": {
                      "kind": "exactNumber.rational",
                      "num": "-1000",
                      "den": "1"
                    },
                    "grade": "USD"
                  }
                },
                "total": {
                  "USD": {
                    "kind": "exactNumber.gradedRational",
                    "value": {
                      "kind": "exactNumber.rational",
                      "num": "-1000",
                      "den": "1"
                    },
                    "grade": "USD"
                  }
                },
                "children": {}
              }
            }
          },
          "Income": {
            "name": "Income",
            "segment": "Income",
            "depth": 0,
            "own": {},
            "total": {
              "USD": {
                "kind": "exactNumber.gradedRational",
                "value": {
                  "kind": "exactNumber.rational",
                  "num": "-500",
                  "den": "1"
                },
                "grade": "USD"
              }
            },
            "children": {
              "Consulting": {
                "name": "Income:Consulting",
                "segment": "Consulting",
                "depth": 1,
                "own": {
                  "USD": {
                    "kind": "exactNumber.gradedRational",
                    "value": {
                      "kind": "exactNumber.rational",
                      "num": "-500",
                      "den": "1"
                    },
                    "grade": "USD"
                  }
                },
                "total": {
                  "USD": {
                    "kind": "exactNumber.gradedRational",
                    "value": {
                      "kind": "exactNumber.rational",
                      "num": "-500",
                      "den": "1"
                    },
                    "grade": "USD"
                  }
                },
                "children": {}
              }
            }
          },
          "Expenses": {
            "name": "Expenses",
            "segment": "Expenses",
            "depth": 0,
            "own": {},
            "total": {
              "USD": {
                "kind": "exactNumber.gradedRational",
                "value": {
                  "kind": "exactNumber.rational",
                  "num": "20",
                  "den": "1"
                },
                "grade": "USD"
              }
            },
            "children": {
              "Software": {
                "name": "Expenses:Software",
                "segment": "Software",
                "depth": 1,
                "own": {
                  "USD": {
                    "kind": "exactNumber.gradedRational",
                    "value": {
                      "kind": "exactNumber.rational",
                      "num": "20",
                      "den": "1"
                    },
                    "grade": "USD"
                  }
                },
                "total": {
                  "USD": {
                    "kind": "exactNumber.gradedRational",
                    "value": {
                      "kind": "exactNumber.rational",
                      "num": "20",
                      "den": "1"
                    },
                    "grade": "USD"
                  }
                },
                "children": {}
              }
            }
          }
        }
      },
      "kind": "ledger-report",
      "report": "balance-sheet",
      "journal": {
        "text": true,
        "format": "beancount"
      },
      "generatedAt": "2026-09-05T00:00:00.000Z"
    },
    "incomeStatement": {
      "tree": {
        "name": "",
        "segment": "",
        "depth": -1,
        "own": {},
        "total": {
          "USD": {
            "kind": "exactNumber.gradedRational",
            "value": {
              "kind": "exactNumber.rational",
              "num": "0",
              "den": "1"
            },
            "grade": "USD"
          }
        },
        "children": {
          "Assets": {
            "name": "Assets",
            "segment": "Assets",
            "depth": 0,
            "own": {},
            "total": {
              "USD": {
                "kind": "exactNumber.gradedRational",
                "value": {
                  "kind": "exactNumber.rational",
                  "num": "1480",
                  "den": "1"
                },
                "grade": "USD"
              }
            },
            "children": {
              "Cash": {
                "name": "Assets:Cash",
                "segment": "Cash",
                "depth": 1,
                "own": {},
                "total": {
                  "USD": {
                    "kind": "exactNumber.gradedRational",
                    "value": {
                      "kind": "exactNumber.rational",
                      "num": "1480",
                      "den": "1"
                    },
                    "grade": "USD"
                  }
                },
                "children": {
                  "Operating": {
                    "name": "Assets:Cash:Operating",
                    "segment": "Operating",
                    "depth": 2,
                    "own": {
                      "USD": {
                        "kind": "exactNumber.gradedRational",
                        "value": {
                          "kind": "exactNumber.rational",
                          "num": "1480",
                          "den": "1"
                        },
                        "grade": "USD"
                      }
                    },
                    "total": {
                      "USD": {
                        "kind": "exactNumber.gradedRational",
                        "value": {
                          "kind": "exactNumber.rational",
                          "num": "1480",
                          "den": "1"
                        },
                        "grade": "USD"
                      }
                    },
                    "children": {}
                  }
                }
              }
            }
          },
          "Equity": {
            "name": "Equity",
            "segment": "Equity",
            "depth": 0,
            "own": {},
            "total": {
              "USD": {
                "kind": "exactNumber.gradedRational",
                "value": {
                  "kind": "exactNumber.rational",
                  "num": "-1000",
                  "den": "1"
                },
                "grade": "USD"
              }
            },
            "children": {
              "Opening-Balances": {
                "name": "Equity:Opening-Balances",
                "segment": "Opening-Balances",
                "depth": 1,
                "own": {
                  "USD": {
                    "kind": "exactNumber.gradedRational",
                    "value": {
                      "kind": "exactNumber.rational",
                      "num": "-1000",
                      "den": "1"
                    },
                    "grade": "USD"
                  }
                },
                "total": {
                  "USD": {
                    "kind": "exactNumber.gradedRational",
                    "value": {
                      "kind": "exactNumber.rational",
                      "num": "-1000",
                      "den": "1"
                    },
                    "grade": "USD"
                  }
                },
                "children": {}
              }
            }
          },
          "Income": {
            "name": "Income",
            "segment": "Income",
            "depth": 0,
            "own": {},
            "total": {
              "USD": {
                "kind": "exactNumber.gradedRational",
                "value": {
                  "kind": "exactNumber.rational",
                  "num": "-500",
                  "den": "1"
                },
                "grade": "USD"
              }
            },
            "children": {
              "Consulting": {
                "name": "Income:Consulting",
                "segment": "Consulting",
                "depth": 1,
                "own": {
                  "USD": {
                    "kind": "exactNumber.gradedRational",
                    "value": {
                      "kind": "exactNumber.rational",
                      "num": "-500",
                      "den": "1"
                    },
                    "grade": "USD"
                  }
                },
                "total": {
                  "USD": {
                    "kind": "exactNumber.gradedRational",
                    "value": {
                      "kind": "exactNumber.rational",
                      "num": "-500",
                      "den": "1"
                    },
                    "grade": "USD"
                  }
                },
                "children": {}
              }
            }
          },
          "Expenses": {
            "name": "Expenses",
            "segment": "Expenses",
            "depth": 0,
            "own": {},
            "total": {
              "USD": {
                "kind": "exactNumber.gradedRational",
                "value": {
                  "kind": "exactNumber.rational",
                  "num": "20",
                  "den": "1"
                },
                "grade": "USD"
              }
            },
            "children": {
              "Software": {
                "name": "Expenses:Software",
                "segment": "Software",
                "depth": 1,
                "own": {
                  "USD": {
                    "kind": "exactNumber.gradedRational",
                    "value": {
                      "kind": "exactNumber.rational",
                      "num": "20",
                      "den": "1"
                    },
                    "grade": "USD"
                  }
                },
                "total": {
                  "USD": {
                    "kind": "exactNumber.gradedRational",
                    "value": {
                      "kind": "exactNumber.rational",
                      "num": "20",
                      "den": "1"
                    },
                    "grade": "USD"
                  }
                },
                "children": {}
              }
            }
          }
        }
      },
      "kind": "ledger-report",
      "report": "income-statement",
      "journal": {
        "text": true,
        "format": "beancount"
      },
      "generatedAt": "2026-09-05T00:00:00.000Z"
    },
    "reconcile": {
      "rows": [
        {
          "account": "Assets:Cash:Operating",
          "commodity": "USD",
          "posted": "1480/1 USD",
          "asserted": "1480/1 USD",
          "assertedAt": "2026-01-15",
          "verdict": "agreed"
        },
        {
          "account": "Assets:Cash:Reserve",
          "commodity": "USD",
          "posted": null,
          "asserted": "50/1 USD",
          "assertedAt": "2026-01-20",
          "verdict": "mismatch"
        },
        {
          "account": "Equity:Opening-Balances",
          "commodity": "USD",
          "posted": "-1000/1 USD",
          "asserted": null,
          "assertedAt": null,
          "verdict": "posted-only"
        },
        {
          "account": "Expenses:Software",
          "commodity": "USD",
          "posted": "20/1 USD",
          "asserted": null,
          "assertedAt": null,
          "verdict": "posted-only"
        },
        {
          "account": "Income:Consulting",
          "commodity": "USD",
          "posted": "-500/1 USD",
          "asserted": null,
          "assertedAt": null,
          "verdict": "posted-only"
        }
      ],
      "summary": {
        "agreed": 1,
        "mismatch": 1,
        "posted-only": 3,
        "asserted-only": 0,
        "inactive": 0
      },
      "kind": "ledger-report",
      "report": "reconcile",
      "journal": {
        "text": true,
        "format": "beancount"
      },
      "generatedAt": "2026-09-05T00:00:00.000Z"
    },
    "stats": {
      "transactions": 3,
      "postings": 6,
      "accounts": 5,
      "commodities": 1,
      "directives": 9,
      "span": "2026-01-01 … 2026-01-10",
      "malformed": 0,
      "held": 1,
      "synthesized": 0,
      "kind": "ledger-report",
      "report": "stats",
      "journal": {
        "text": true,
        "format": "beancount"
      },
      "generatedAt": "2026-09-05T00:00:00.000Z"
    },
    "accounts": {
      "accounts": [
        "Assets:Cash:Operating",
        "Assets:Cash:Reserve",
        "Equity:Opening-Balances",
        "Expenses:Software",
        "Income:Consulting"
      ],
      "kind": "ledger-report",
      "report": "accounts",
      "journal": {
        "text": true,
        "format": "beancount"
      },
      "generatedAt": "2026-09-05T00:00:00.000Z"
    }
  }
}
~~~
