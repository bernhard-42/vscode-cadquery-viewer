from setuptools import setup, find_packages

setup_args = {
    "name": "cq_vscode",
    "version": "0.26.0",
    "description": "CadQuery Viewer for VSCode",
    "long_description": "An extension to show cadquery objects in VSCode via pythreejs",
    "include_package_data": True,
    "python_requires": ">=3.9",
    "install_requires": ["ocp-tessellate>=1.0.0rc2", "requests"],
    "packages": find_packages(),
    "zip_safe": False,
    "author": "Bernhard Walter",
    "author_email": "b_walter@arcor.de",
    "url": "https://github.com/bernhard-42/vscode-cadquery-viewer",
    "keywords": ["vscode", "widgets", "CAD", "cadquery"],
    "classifiers": [
        "Development Status :: 5 - Production/Stable",
        "Framework :: IPython",
        "Intended Audience :: Developers",
        "Intended Audience :: Science/Research",
        "Topic :: Multimedia :: Graphics",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
}

setup(**setup_args)
