{
  description = "PyFARS — Python implementation of FARS (Flatfile Agentic Resource System)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        python = pkgs.python313;

        pyfars = python.pkgs.buildPythonApplication {
          pname = "pyfars";
          version = "0.1.0";
          src = ./.;
          format = "pyproject";
          nativeBuildInputs = [ python.pkgs.setuptools ];
          propagatedBuildInputs = with python.pkgs; [
            pyyaml
            jinja2
            mcp
            authlib
            httpx
            pydantic
            fastapi
            uvicorn
          ];
          doCheck = false;
        };

        testPython = python.withPackages (ps: with ps; [
          pyyaml
          jinja2
          mcp
          authlib
          httpx
          pydantic
          fastapi
          uvicorn
          pytest
        ]);

        pyfarsTests = pkgs.runCommand "pyfars-tests"
          {
            nativeBuildInputs = [
              testPython
              pyfars
              pkgs.git
            ];
          } ''
            cp -R ${./.} source
            chmod -R u+w source
            cd source
            export PATH="${pkgs.git}/bin:$PATH"
            pytest tests -q
            touch $out
          '';
      in {
        packages = {
          inherit pyfars;
          default = pyfars;
        };

        checks = {
          pyfars-tests = pyfarsTests;
          default = pyfarsTests;
        };

        apps.pyfars = {
          type = "app";
          program = "${pyfars}/bin/pyfars";
        };
        apps.default = self.apps.${system}.pyfars;

        devShells.default = pkgs.mkShell {
          name = "pyfars-dev";
          packages = [
            python
            pyfars
            pkgs.git
          ] ++ (with python.pkgs; [
            pyyaml
            jinja2
            pytest
            setuptools
            mcp
            authlib
            httpx
            pydantic
            fastapi
            uvicorn
          ]);
          shellHook = ''
            echo "pyfars development shell"
            echo "  python: $(${python}/bin/python --version)"
            echo "  pyfars: $(command -v pyfars)"
            echo "Run tests with: nix flake check or pytest tests -q"
          '';
        };
      });
}
