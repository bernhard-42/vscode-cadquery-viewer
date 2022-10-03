from setuptools import setup, find_packages

setup_args = {
    "name": "cq_vscode",
    "version": "0.9.3",
    "description": "CadQuery Viewer for VSCode",
    "long_description": "An extension to show cadquery objects in VSCode via pythreejs",
    "include_package_data": True,
    "python_requires": ">=3.6",
    "install_requires": ["jupyter_cadquery~=3.3.0"],
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
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
    ],
}

setup(**setup_args)
